import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Loader2, Activity, Server, GitBranch, Coffee, XCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const PreviewPage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    fetchPreview();
  }, [projectId]);

  useEffect(() => {
    if (project?.last_deployed) {
      const start = new Date(project.last_deployed).getTime();
      const interval = setInterval(() => {
        setUptime(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [project]);

  const fetchPreview = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/preview/${projectId}`);
      setProject(data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-white mb-2">Application Not Found</h1>
          <p className="text-slate-400">This deployment is not available or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" data-testid="preview-page">
      {/* Top bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-mono text-slate-400">{project.display_url}</span>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Powered by JavaHost
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">Application is running</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4" data-testid="preview-app-name">
            {project.name}
          </h1>
          <p className="text-slate-400 text-lg">
            Your Spring Boot backend is live and serving requests
          </p>
        </div>

        {/* Spring Boot banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8 font-mono text-sm overflow-x-auto">
          <pre className="text-emerald-400 text-xs sm:text-sm leading-tight whitespace-pre">
{`  .   ____          _            __ _ _
 /\\\\ / ___'_ __ _ _(_)_ __  __ _ \\ \\ \\ \\
( ( )\\___ | '_ | '_| | '_ \\/ _\` | \\ \\ \\ \\
 \\\\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.2.1)`}
          </pre>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5" data-testid="stat-status">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <Activity className="w-4 h-4" />
              STATUS
            </div>
            <div className="text-emerald-400 text-xl font-semibold">{project.status}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5" data-testid="stat-uptime">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <Server className="w-4 h-4" />
              UPTIME
            </div>
            <div className="text-white text-xl font-mono">{formatUptime(uptime)}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5" data-testid="stat-java">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <Coffee className="w-4 h-4" />
              JAVA
            </div>
            <div className="text-white text-xl font-semibold">Java {project.java_version}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5" data-testid="stat-branch">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <GitBranch className="w-4 h-4" />
              BRANCH
            </div>
            <div className="text-white text-xl font-mono">{project.branch}</div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden mb-8">
          <div className="bg-slate-800/50 px-5 py-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white">Available API Endpoints</h2>
          </div>
          <div className="divide-y divide-slate-800">
            {[
              { method: 'GET', path: '/', desc: 'Application root' },
              { method: 'GET', path: '/api/info', desc: 'Application information' },
              { method: 'GET', path: '/actuator/health', desc: 'Health check endpoint' },
              { method: 'GET', path: '/actuator/info', desc: 'Actuator info' },
              { method: 'GET', path: '/actuator/metrics', desc: 'Application metrics' },
            ].map((endpoint, idx) => (
              <div key={idx} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-800/30 transition-colors" data-testid={`endpoint-${idx}`}>
                <span className="inline-block w-14 text-center text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">
                  {endpoint.method}
                </span>
                <span className="font-mono text-sm text-slate-300 flex-1">{endpoint.path}</span>
                <span className="text-xs text-slate-500 hidden sm:block">{endpoint.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Health Check Response Sample */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden mb-8">
          <div className="bg-slate-800/50 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">GET /actuator/health</h2>
            <span className="text-xs font-mono text-emerald-400">200 OK</span>
          </div>
          <pre className="p-5 text-sm font-mono text-slate-300 overflow-x-auto" data-testid="health-response">
{`{
  "status": "UP",
  "components": {
    "db": {
      "status": "UP",
      "details": {
        "database": "PostgreSQL",
        "validationQuery": "isValid()"
      }
    },
    "diskSpace": {
      "status": "UP",
      "details": {
        "total": 107374182400,
        "free": 89478485400,
        "threshold": 10485760
      }
    },
    "ping": {
      "status": "UP"
    }
  }
}`}
          </pre>
        </div>

        {/* Build Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Build Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm font-mono">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">Build Tool</span>
              <span className="text-white">{project.build_tool.toUpperCase()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">Java Version</span>
              <span className="text-white">{project.java_version}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">Source Branch</span>
              <span className="text-white">{project.branch}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">Last Deployed</span>
              <span className="text-white text-xs">{new Date(project.last_deployed).toLocaleString()}</span>
            </div>
            <div className="flex justify-between sm:col-span-2 border-b border-slate-800 pb-2">
              <span className="text-slate-500">Repository</span>
              <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 truncate ml-4">
                {project.github_url}
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-xs text-slate-600">
          Hosted on JavaHost • Spring Boot {project.build_tool.toUpperCase()} Application
        </div>
      </div>
    </div>
  );
};
