from typing import Dict, List, Optional, Union
import anthropic
from openai import AsyncOpenAI
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from dataclasses import dataclass
import pandas as pd
import json
import re
from datetime import datetime


@dataclass
class DatabaseConfig:
    type: str
    host: str
    port: int
    user: str
    password: str
    database: str
    ssl: bool = False


@dataclass
class AIConfig:
    provider: str  # 'claude' or 'openai'
    api_key: str
    model: Optional[str] = None
    temperature: float = 0
    max_tokens: int = 1000


class AIQueryExecutor:
    def __init__(self, ai_config: AIConfig, db_config: DatabaseConfig):
        self.ai_config = ai_config
        self.db_config = db_config
        self.engine: Optional[Engine] = None
        self.schema = {"tables": {}, "relationships": []}

        # Set default AI models if not specified
        if not self.ai_config.model:
            self.ai_config.model = (
                "claude-3-opus-20240229" if ai_config.provider == "claude"
                else "gpt-4"
            )

        # Initialize AI client
        if ai_config.provider == "claude":
            self.ai_client = anthropic.Anthropic(api_key=ai_config.api_key)
        else:
            self.ai_client = AsyncOpenAI(api_key=ai_config.api_key)

    def connect(self) -> None:
        """Establish database connection and fetch schema."""
        try:
            # Create connection URL
            if self.db_config.type == "postgresql":
                url = f"postgresql://{self.db_config.user}:{self.db_config.password}@{self.db_config.host}:{self.db_config.port}/{self.db_config.database}"
            elif self.db_config.type == "mysql":
                url = f"mysql+pymysql://{self.db_config.user}:{self.db_config.password}@{self.db_config.host}:{self.db_config.port}/{self.db_config.database}"
            else:
                raise ValueError(f"Unsupported database type: {self.db_config.type}")

            # Add SSL if required
            if self.db_config.ssl:
                url += "?ssl=true"

            # Create engine with connection pooling
            self.engine = create_engine(
                url,
                pool_size=5,
                max_overflow=10,
                pool_timeout=30,
                pool_recycle=3600
            )

            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))

            # Fetch schema if not already loaded
            if not self.schema["tables"]:
                self.fetch_database_schema()

        except Exception as e:
            raise ConnectionError(f"Database connection failed: {str(e)}")

    def disconnect(self) -> None:
        """Close database connection."""
        if self.engine:
            self.engine.dispose()
            self.engine = None

    def fetch_database_schema(self) -> Dict:
        """Fetch database schema including tables, columns, and relationships."""
        if not self.engine:
            raise ConnectionError("Not connected to database")

        inspector = inspect(self.engine)
        schema = {"tables": {}, "relationships": []}

        # Fetch tables and columns
        for table_name in inspector.get_table_names():
            columns = []
            for column in inspector.get_columns(table_name):
                columns.append({
                    "name": column["name"],
                    "type": str(column["type"])
                })
            schema["tables"][table_name] = columns

        # Fetch foreign key relationships
        for table_name in inspector.get_table_names():
            for fk in inspector.get_foreign_keys(table_name):
                schema["relationships"].append({
                    "table1": table_name,
                    "table2": fk["referred_table"],
                    "type": "foreignKey",
                    "keys": {
                        table_name: fk["constrained_columns"][0],
                        fk["referred_table"]: fk["referred_columns"][0]
                    }
                })

        self.schema = schema
        return schema

    def generate_schema_description(self) -> str:
        """Generate a human-readable description of the database schema."""
        description = "Database Schema:\n\n"

        # Describe tables and columns
        for table_name, columns in self.schema["tables"].items():
            description += f"Table: {table_name}\n"
            description += "Columns:\n"
            for col in columns:
                description += f"  - {col['name']} ({col['type']})\n"
            description += "\n"

        # Describe relationships
        if self.schema["relationships"]:
            description += "Relationships:\n"
            for rel in self.schema["relationships"]:
                description += f"- {rel['table1']} {rel['type']} {rel['table2']}"
                description += f" ({rel['table1']}.{rel['keys'][rel['table1']]} -> "
                description += f"{rel['table2']}.{rel['keys'][rel['table2']]})\n"

        return description

    async def build_query(self, natural_language: str) -> Dict:
        """Generate SQL query from natural language using AI."""
        try:
            if self.ai_config.provider == "claude":
                return await self._build_query_with_claude(natural_language)
            else:
                return await self._build_query_with_openai(natural_language)
        except Exception as e:
            return {
                "error": True,
                "message": f"Failed to build query: {str(e)}",
                "original_input": natural_language
            }

    async def _build_query_with_claude(self, natural_language: str) -> Dict:
        """Generate SQL query using Claude."""
        system_prompt = self._get_system_prompt()

        try:
            message = await self.ai_client.messages.create(
                model=self.ai_config.model,
                max_tokens=self.ai_config.max_tokens,
                temperature=self.ai_config.temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": natural_language}
                ]
            )

            # Get the response content
            response_text = message.content[0].text

            # Try to parse the JSON response
            try:
                result = json.loads(response_text)
            except json.JSONDecodeError as e:
                print(f"Failed to parse JSON response: {response_text}")
                raise ValueError(f"Invalid JSON response: {str(e)}")

            # Validate required fields
            if "sql" not in result:
                raise ValueError("Response missing required 'sql' field")

            return {**result, "success": True}

        except Exception as e:
            print(f"Error in Claude query generation: {str(e)}")
            raise ValueError(f"Failed to generate query: {str(e)}")

    async def _build_query_with_openai(self, natural_language: str) -> Dict:
        """Generate SQL query using OpenAI."""
        system_prompt = self._get_system_prompt()

        try:
            # Base configuration
            completion_params = {
                "model": self.ai_config.model,
                "temperature": self.ai_config.temperature,
                "max_tokens": self.ai_config.max_tokens,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": natural_language}
                ]
            }

            # Add response_format only for compatible models (gpt-4-1106-preview or gpt-3.5-turbo-1106)
            if self.ai_config.model in ["gpt-4-1106-preview", "gpt-3.5-turbo-1106"]:
                completion_params["response_format"] = {"type": "json_object"}

            response = await self.ai_client.chat.completions.create(**completion_params)

            # Get the response content
            response_text = response.choices[0].message.content

            # Try to parse the JSON response
            try:
                # Remove any potential markdown formatting
                clean_text = response_text.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:]
                if clean_text.endswith("```"):
                    clean_text = clean_text[:-3]
                clean_text = clean_text.strip()

                result = json.loads(clean_text)
            except json.JSONDecodeError as e:
                print(f"Failed to parse JSON response: {response_text}")
                raise ValueError(f"Invalid JSON response: {str(e)}")

            # Validate required fields
            if "sql" not in result:
                raise ValueError("Response missing required 'sql' field")

            return {**result, "success": True}

        except Exception as e:
            print(f"Error in OpenAI query generation: {str(e)}")
            raise ValueError(f"Failed to generate query: {str(e)}")

    def _get_system_prompt(self) -> str:
        """Generate system prompt for AI models."""
        return f"""You are a SQL query generator. Convert natural language requests into valid SQL queries using the provided database schema.

{self.generate_schema_description()}

REQUIREMENTS:
1. Return ONLY a JSON object with this exact structure:
{{
  "sql": "SELECT * FROM example",
  "explanation": "This query does X",
  "validation": {{
    "isValid": true,
    "issues": []
  }}
}}

2. Follow these rules:
- Use only tables and columns from the schema
- Include comments for complex queries
- Use proper SQL syntax and JOIN statements
- Always verify column references
- Handle dates and times appropriately
- Use appropriate SQL functions
- Ensure proper WHERE clauses

Do not include any other text, markdown, or explanation outside the JSON object. The response should be a single, valid JSON object that can be parsed directly."""

    def is_unsafe_query(self, sql: str) -> bool:
        """Check if the query contains unsafe operations."""
        unsafe_patterns = [
            r"DROP\s+",
            r"DELETE\s+WITHOUT\s+WHERE",
            r"UPDATE\s+WITHOUT\s+WHERE",
            r"TRUNCATE\s+",
            r"ALTER\s+",
            r"GRANT\s+",
            r"REVOKE\s+"
        ]

        return any(re.search(pattern, sql, re.IGNORECASE) for pattern in unsafe_patterns)

    def validate_query(self, sql: str) -> Dict:
        """Validate the SQL query against the schema."""
        issues = []

        # Extract table and column references
        table_pattern = r"FROM\s+(\w+)|JOIN\s+(\w+)"
        column_pattern = r"SELECT\s+(.+?)\s+FROM|WHERE\s+(.+?)\s+(?:GROUP|ORDER|LIMIT|$)|GROUP BY\s+(.+?)\s+(?:ORDER|LIMIT|$)|ORDER BY\s+(.+?)\s+(?:LIMIT|$)"

        # Validate table references
        for match in re.finditer(table_pattern, sql, re.IGNORECASE):
            table_name = match.group(1) or match.group(2)
            if table_name not in self.schema["tables"]:
                issues.append(f"Invalid table reference: {table_name}")

        # Validate column references
        for match in re.finditer(column_pattern, sql, re.IGNORECASE):
            columns = match.group(1) or match.group(2) or match.group(3) or match.group(4)
            if columns and columns != '*':
                for col in columns.split(','):
                    column_name = col.strip().split('.')[-1]
                    if not any(
                            any(c["name"] == column_name for c in table_cols)
                            for table_cols in self.schema["tables"].values()
                    ):
                        issues.append(f"Invalid column reference: {column_name}")

        return {
            "isValid": len(issues) == 0,
            "issues": issues
        }

    async def execute_query(
            self,
            natural_language: str,
            use_transaction: bool = True,
            timeout: int = 30
    ) -> Dict:
        """Execute natural language query and return results."""
        try:
            if not self.engine:
                self.connect()

            # Generate query using AI
            query_result = await self.build_query(natural_language)

            if not query_result.get("success") or not query_result.get("sql"):
                raise ValueError("Failed to generate SQL query")

            sql = query_result["sql"]

            # Check for unsafe operations
            if self.is_unsafe_query(sql):
                raise ValueError("Query contains unsafe operations")

            start_time = datetime.now()

            # Execute query
            with self.engine.connect() as connection:
                if use_transaction:
                    with connection.begin():
                        result = connection.execute(text(sql))
                        data = result.fetchall()
                else:
                    result = connection.execute(text(sql))
                    data = result.fetchall()

            # Convert to DataFrame for easier handling
            df = pd.DataFrame(data, columns=result.keys())

            execution_time = (datetime.now() - start_time).total_seconds()

            return {
                "success": True,
                "query": query_result,
                "results": df.to_dict(orient="records"),
                "columns": list(df.columns),
                "row_count": len(df),
                "execution_time": execution_time,
                "sql": sql  # Include the executed SQL for reference
            }

        except Exception as e:
            print(f"Error executing query: {str(e)}")
            print(f"SQL Query: {query_result.get('sql') if 'query_result' in locals() else 'Not generated'}")
            return {
                "success": False,
                "error": str(e),
                "query": query_result if 'query_result' in locals() else None
            }