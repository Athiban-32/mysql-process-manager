from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
from pydantic import BaseModel
from typing import List, Dict
import random
import re

app = FastAPI()

# Allow frontend (React) access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MySQL connection
def get_connection(db_name="information_schema"):
    return mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="athiban@0047",
        database=db_name,
        port=3306
    )

# Pydantic models
class KillProcesses(BaseModel):
    process_ids: List[int]

class RecommendQuery(BaseModel):
    query: str

class ExecuteQuery(BaseModel):
    query: str
    db: str = None

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "✅ FastAPI is running! Visit /docs for API docs."}

# DB health check
@app.get("/ping")
def ping_db():
    try:
        conn = get_connection()
        conn.close()
        return {"db": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

# Get database list
@app.get("/databases")
def get_databases():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SHOW DATABASES")
        dbs = [row[0] for row in cursor.fetchall()]
        cursor.close()
        conn.close()
        return dbs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching databases: {str(e)}")

# Show process list with enhanced info
@app.get("/processes")
def get_processes():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SHOW FULL PROCESSLIST")
        processes = cursor.fetchall()
        
        # Add simulated CPU/memory metrics for demonstration
        for p in processes:
            p['CPU'] = random.uniform(0, 10)
            p['Memory'] = random.uniform(10, 500)
        
        cursor.close()
        conn.close()
        return processes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching processes: {str(e)}")

# Kill multiple processes
@app.post("/kill")
def kill_process(kill: KillProcesses):
    killed = []
    failed = []
    try:
        conn = get_connection()
        cursor = conn.cursor()
        for pid in kill.process_ids:
            try:
                cursor.execute(f"KILL {pid}")
                killed.append(pid)
            except Exception as e:
                failed.append({"id": pid, "error": str(e)})
        conn.commit()
        return {"status": "success", "killed": killed, "failed": failed}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# AI Copilot: Recommend query optimization
@app.post("/recommend")
def recommend_query(body: RecommendQuery):
    query = body.query.strip().lower()
    recs = []

    if "select *" in query:
        recs.append("Avoid using SELECT *; select only necessary columns.")
    if "like '%" in query:
        recs.append("Consider adding an index to the searched column for faster LIKE queries.")
    if "join" in query and "on" not in query:
        recs.append("Make sure to use proper ON conditions for JOINs to avoid Cartesian products.")
    if "order by" in query and "limit" not in query:
        recs.append("Add LIMIT when possible with ORDER BY to reduce sorting cost.")
    if not recs:
        recs.append("✅ Query looks fine, but monitor its runtime for optimization opportunities.")

    return {"recommendations": recs}

# Explain plan analyzer with AI interpretation
@app.post("/explain")
def explain_query(body: RecommendQuery):
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        explain_plan = []
        try:
            query = body.query.replace("\\G", "").strip()
            cursor.execute(f"EXPLAIN {query}")
            explain_plan = cursor.fetchall()
        except mysql.connector.Error as err:
            raise HTTPException(status_code=400, detail=f"Error running EXPLAIN: {err.msg}")

        ai_interpretation = []
        if not explain_plan:
            ai_interpretation.append("No execution plan found.")
        else:
            for row in explain_plan:
                if row.get('rows', 0) > 10000:
                    ai_interpretation.append(f"❌ This query processes a large number of rows (~{row['rows']}). This could be slow.")
                if row.get('type') == 'ALL':
                    ai_interpretation.append("⚠️ A full table scan ('type: ALL') is occurring. Consider adding an index to improve performance.")
                if row.get('Extra') and 'Using filesort' in row['Extra']:
                    ai_interpretation.append("🚨 'Using filesort' means MySQL is sorting data on disk. This is a big performance hit. Add an index to the columns in your ORDER BY clause.")
                if row.get('Extra') and 'Using temporary' in row['Extra']:
                    ai_interpretation.append("⚠️ 'Using temporary' means MySQL created a temporary table, which can be slow. Check your GROUP BY clauses or complex joins.")
                
        if not ai_interpretation:
            ai_interpretation.append("✅ The query plan looks efficient. It's likely using indexes correctly.")

        return {"plan": explain_plan, "interpretation": ai_interpretation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# Execute a raw SQL query
@app.post("/execute")
def execute_raw_query(body: ExecuteQuery):
    try:
        db_to_use = body.db if body.db else "information_schema"
        conn = get_connection(db_name=db_to_use)
        cursor = conn.cursor(dictionary=True)
        
        # Remove MySQL client commands like \G from the query
        clean_query = body.query.strip().replace("\\G", "")
        
        # Determine query type (DML, DDL, SELECT)
        query_type_match = re.match(r"^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|SHOW)\b", clean_query, re.IGNORECASE)
        query_type = query_type_match.group(1).upper() if query_type_match else "OTHER"
        
        cursor.execute(clean_query)
        
        result = {}
        if query_type == "SELECT" or query_type == "SHOW":
            result["data"] = cursor.fetchall()
            result["columns"] = [i[0] for i in cursor.description] if cursor.description else []
        else:
            conn.commit()
            result["message"] = f"Query executed successfully. Rows affected: {cursor.rowcount}"
            
        cursor.close()
        conn.close()
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()