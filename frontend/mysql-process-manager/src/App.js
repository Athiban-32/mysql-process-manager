import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid
} from "recharts";
import "./App.css";

const COLORS = ["#6a11cb", "#2575fc", "#ff416c", "#ff4b2b", "#38ef7d", "#f5a623"];

const Modal = ({ process, onClose }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (process?.Info) {
      setLoading(true);
      axios.post("http://localhost:8000/recommend", { query: process.Info })
        .then((res) => setRecommendations(res.data.recommendations || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setRecommendations([]);
    }
  }, [process]);

  if (!process) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h2>Process Details - ID {process.Id}</h2>
        <p><strong>User:</strong> {process.User}</p>
        <p><strong>DB:</strong> {process.Db || "-"}</p>
        <p><strong>Command:</strong> {process.Command}</p>
        <p><strong>Time:</strong> {process.Time}</p>
        <p><strong>State:</strong> {process.State || "-"}</p>
        <p><strong>Info:</strong></p>
        <pre className="query-text">{process.Info || "-"}</pre>

        {loading && <div className="ai-typing"><span>.</span><span>.</span><span>.</span></div>}

        {recommendations.length > 0 && (
          <>
            <h3>AI Recommendations:</h3>
            <ul className="recommendations">
              {recommendations.map((r, i) => (
                <li key={i} className="ai-bubble">{r}</li>
              ))}
            </ul>
            <button className="optimize-btn" onClick={() => {
              navigator.clipboard.writeText(process.Info || "");
              alert("Query copied! Now optimize it using the AI tips.");
            }}>⚡ Optimize Query</button>
          </>
        )}

        <button className="close-btn" onClick={onClose}>Close</button>
      </motion.div>
    </div>
  );
};

const ExplainModal = ({ process, onClose }) => {
    const [explainData, setExplainData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [aiInterpretation, setAiInterpretation] = useState([]);

    useEffect(() => {
        const fetchExplain = async () => {
            if (!process?.Info) return;
            setLoading(true);
            try {
                const res = await axios.post("http://localhost:8000/explain", { query: process.Info });
                setExplainData(res.data.plan);
                setAiInterpretation(res.data.interpretation);
            } catch (err) {
                console.error(err);
                alert("Failed to get explain plan: " + (err.response?.data?.detail || err.message));
                setExplainData(null);
                setAiInterpretation(["Could not generate an explain plan."]);
            } finally {
                setLoading(false);
            }
        };
        fetchExplain();
    }, [process]);

    if (!process) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div className="modal-content explain-modal" onClick={e => e.stopPropagation()} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <h2>Explain Plan for ID {process.Id}</h2>
                <pre className="query-text">{process.Info}</pre>
                
                {loading && <div className="ai-typing"><span>.</span><span>.</span><span>.</span></div>}
                
                {aiInterpretation.length > 0 && (
                    <>
                        <h3>AI Interpretation:</h3>
                        <ul className="recommendations">
                            {aiInterpretation.map((r, i) => <li key={i} className="ai-bubble">{r}</li>)}
                        </ul>
                    </>
                )}

                {explainData && (
                    <>
                        <h3>Raw Plan:</h3>
                        <div className="table-container">
                            <table className="explain-table">
                                <thead>
                                    <tr>{explainData.length > 0 && Object.keys(explainData[0]).map(key => <th key={key}>{key}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {explainData.map((row, i) => (
                                        <tr key={i}>
                                            {Object.values(row).map((val, j) => <td key={j}>{val || 'NULL'}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                <button className="close-btn" onClick={onClose}>Close</button>
            </motion.div>
        </div>
    );
};

const QueryExecutor = ({ databases }) => {
    const [query, setQuery] = useState("");
    const [db, setDb] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleExecute = async () => {
        setLoading(true);
        setResult(null);
        setError(null);
        try {
            const res = await axios.post("http://localhost:8000/execute", { query, db });
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            className="query-executor"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <motion.h2
                className="executor-title"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                SQL Query Executor 
            </motion.h2>
            <div className="executor-controls">
                <select value={db} onChange={e => setDb(e.target.value)} disabled={loading}>
                    <option value="">Select Database</option>
                    {databases.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
                <motion.button
                    className="execute-btn"
                    onClick={handleExecute}
                    disabled={loading || !query}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {loading ? "Executing..." : "Execute Query"}
                </motion.button>
            </div>
            <motion.textarea
                placeholder="Enter your SQL query here..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                rows="8"
                disabled={loading}
                className="query-input"
                whileFocus={{ borderColor: '#2575fc', boxShadow: '0 0 10px rgba(37, 117, 252, 0.5)' }}
            ></motion.textarea>

            {loading && <div className="loader">Executing...</div>}
            {error && (
                <motion.div
                    className="error-message"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    Error: {error}
                </motion.div>
            )}

            {result && (
                <motion.div
                    className="executor-result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    {result.message ? (
                        <motion.p className="success-message" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                            {result.message}
                        </motion.p>
                    ) : (
                        <div className="result-table-container">
                            <table className="result-table">
                                <thead>
                                    <tr>
                                        {result.columns.map(col => (
                                            <th key={col}>{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.data.map((row, i) => (
                                        <tr key={i}>
                                            {Object.values(row).map((val, j) => (
                                                <td key={j}>{val}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
};

const ResourceChart = ({ data, title, dataKey, color }) => (
    <div className="chart-container">
        <h3 className="chart-title">{title}</h3>
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey={dataKey} stroke={color} />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

function App() {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "Id", direction: "asc" });
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [selectedProcesses, setSelectedProcesses] = useState([]);
  const [showDashboard, setShowDashboard] = useState(true);
  const [showExecutor, setShowExecutor] = useState(false);
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [resourceHistory, setResourceHistory] = useState([]);

  const intervalRef = useRef(null);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:8000/processes");
      setProcesses(res.data);

      // Update resource history
      const totalCPU = res.data.reduce((sum, p) => sum + p.CPU, 0);
      const totalMemory = res.data.reduce((sum, p) => sum + p.Memory, 0);
      setResourceHistory(prevHistory => {
        const newHistory = [...prevHistory, {
          name: new Date().toLocaleTimeString(),
          cpu: totalCPU,
          memory: totalMemory,
        }].slice(-10); // Keep last 10 data points
        return newHistory;
      });

    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchDatabases = async () => {
    try {
      const res = await axios.get("http://localhost:8000/databases");
      setDatabases(res.data);
    } catch (err) { console.error(err); }
  };

  const killSelected = async () => {
    if (selectedProcesses.length === 0) return alert("No processes selected.");
    if (window.confirm(`⚠️ Kill ${selectedProcesses.length} process(es)?`)) {
      try {
        await axios.post("http://localhost:8000/kill", { process_ids: selectedProcesses });
        setSelectedProcesses([]);
        fetchProcesses();
      } catch (err) { alert("❌ Failed to kill processes: " + err.message); }
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedProcesses = [...processes].sort((a, b) => {
    const key = sortConfig.key;
    let aVal = a[key] ?? "";
    let bVal = b[key] ?? "";
    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const filteredProcesses = sortedProcesses.filter((p) =>
    ["User", "Db", "Command", "State", "Info"].some((key) =>
      (p[key] || "").toString().toLowerCase().includes(search.toLowerCase())
    )
  );

  useEffect(() => {
    fetchProcesses();
    fetchDatabases();
    clearInterval(intervalRef.current);
    if (autoRefresh) intervalRef.current = setInterval(fetchProcesses, 5000);
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh]);

  // Dashboard data
  const userCounts = processes.reduce((acc, p) => { acc[p.User] = (acc[p.User] || 0) + 1; return acc; }, {});
  const userData = Object.keys(userCounts).map((u) => ({ name: u, value: userCounts[u] }));
  const commandCounts = processes.reduce((acc, p) => { acc[p.Command] = (acc[p.Command] || 0) + 1; return acc; }, {});
  const commandData = Object.keys(commandCounts).map((c) => ({ name: c, value: commandCounts[c] }));

  // Find blocking queries
  const blockingQuery = processes.find(p => p.State?.toLowerCase().includes("waiting for lock"));
  
  if (loading && processes.length === 0) {
    return (
      <div className="fullpage-loader">
        <div className="loading-bar"></div>
        <p>Loading MySQL processes...</p>
      </div>
    );
  }

  return (
    <div className={darkMode ? "App dark" : "App"}>
      <header>
        <h1>⚡ MySQL Process Manager</h1>
        <div className="controls">
          <button className="toggle-btn" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"}
          </button>
          <button className={`refresh-btn ${!autoRefresh ? "paused" : ""}`} onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? "⏸ Pause" : "🔄 Refresh"}
          </button>
          <button className="dashboard-btn" onClick={() => setShowDashboard(!showDashboard)}>
            {showDashboard ? "📋 Table View" : "📊 Dashboard"}
          </button>
          <button className="refresh-btn" onClick={() => setShowExecutor(!showExecutor)}>
            {showExecutor ? "◀ Back" : "📝 Query Executor"}
          </button>
        </div>
      </header>

      {showExecutor ? (
          <QueryExecutor databases={databases} />
      ) : showDashboard ? (
        <div className="dashboard">
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Live Dashboard</motion.h2>
          <div className="stats">
            <motion.div className="stat-card" initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <h3>Active Processes</h3>
              <motion.p key={processes.length} animate={{ scale: [1.2, 1] }}>{processes.length}</motion.p>
            </motion.div>
            {blockingQuery && (
                 <motion.div className="stat-card" style={{ background: 'linear-gradient(135deg, #e63946, #ff6f61)'}} initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <h3>Blocking Query</h3>
                    <motion.p animate={{ scale: [1.2, 1] }}>ID {blockingQuery.Id}</motion.p>
                </motion.div>
            )}
          </div>
          <div className="charts">
            <div className="chart-container">
              <h3 className="chart-title">Processes by User</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={userData} dataKey="value" nameKey="name" outerRadius={100} label>
                    {userData.map((entry, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-container">
              <h3 className="chart-title">Processes by Command</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={commandData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value">{commandData.map((entry,index)=>(<Cell key={index} fill={COLORS[index % COLORS.length]} />))}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="charts">
            <ResourceChart data={resourceHistory} title="CPU Usage (%)" dataKey="cpu" color="#6a11cb" />
            <ResourceChart data={resourceHistory} title="Memory Usage (MB)" dataKey="memory" color="#2575fc" />
          </div>
        </div>
      ) : (
        <>
          <div className="search-container">
            <input type="text" placeholder="Search User, DB, Command, State..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="batch-actions">
            <button className="kill-selected-btn" onClick={killSelected} disabled={selectedProcesses.length === 0}>
              Kill Selected ({selectedProcesses.length})
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={selectedProcesses.length === filteredProcesses.length && filteredProcesses.length > 0} onChange={(e) =>
                      setSelectedProcesses(e.target.checked ? filteredProcesses.map(p => p.Id) : [])
                    } />
                  </th>
                  {["Id", "User", "Host", "Db", "Command", "Time", "State", "Info"].map(key => (
                    <th key={key} onClick={() => handleSort(key)}>
                      {key} {sortConfig.key === key ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcesses.length > 0 ? filteredProcesses.map(p => (
                  <motion.tr key={p.Id} onClick={() => setSelectedProcess(p)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={p.State?.toLowerCase().includes("waiting") ? 'blocking-highlight' : ''}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedProcesses.includes(p.Id)} onChange={() => {
                        setSelectedProcesses(prev => prev.includes(p.Id) ? prev.filter(pid => pid !== p.Id) : [...prev, p.Id]);
                      }} />
                    </td>
                    <td>{p.Id}</td>
                    <td>{p.User}</td>
                    <td>{p.Host}</td>
                    <td>{p.Db || "-"}</td>
                    <td>{p.Command}</td>
                    <td>{p.Time}</td>
                    <td>{p.State || "-"}</td>
                    <td className="info-cell" onClick={e => { e.stopPropagation(); setSelectedProcess(p); }}>{p.Info || "-"}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="actions">
                        <button className="copy-btn" onClick={() => navigator.clipboard.writeText(p.Info || "")}>Copy</button>
                        <button className="optimize-btn" onClick={() => { setShowExplainModal(true); setSelectedProcess(p); }}>Explain</button>
                      </div>
                    </td>
                  </motion.tr>
                )) : <tr><td colSpan="10" style={{ textAlign: "center" }}>✅ No matching processes</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal process={selectedProcess} onClose={() => setSelectedProcess(null)} />
      {showExplainModal && <ExplainModal process={selectedProcess} onClose={() => setShowExplainModal(false)} />}
    </div>
  );
}

export default App;