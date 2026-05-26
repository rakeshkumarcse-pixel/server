import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Plus, LogOut, GitBranch, Calendar, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const StatusBadge = ({ status }) => {
  const statusConfig = {
    idle: { label: 'Idle', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock },
    building: { label: 'Building', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Loader2 },
    deployed: { label: 'Deployed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    failed: { label: 'Failed', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle }
  };

  const config = statusConfig[status] || statusConfig.idle;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`} data-testid={`status-badge-${status}`}>
      <Icon className={`w-3 h-3 ${status === 'building' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
};

export const DashboardPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/projects`, {
        withCredentials: true
      });
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50" data-testid="dashboard-nav">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <GitBranch className="w-6 h-6 text-slate-900" />
              <h1 className="text-xl font-semibold tracking-tight text-slate-950">JavaHost</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500" data-testid="user-email">{user?.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-700 hover:text-slate-900"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950" data-testid="dashboard-title">Projects</h2>
            <p className="text-sm text-slate-500 mt-1">Manage your Java & Spring Boot deployments</p>
          </div>
          <Button
            onClick={() => navigate('/projects/new')}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            data-testid="new-project-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-md p-12 text-center" data-testid="empty-state">
            <img
              src="https://images.unsplash.com/photo-1707061229292-ad11decf3eea?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwxfHxqYXZhJTIwc3ByaW5nJTIwYm9vdCUyMGxvZ298ZW58MHx8fHwxNzc5MTMyMDI3fDA&ixlib=rb-4.1.0&q=85"
              alt="Empty state"
              className="w-32 h-32 mx-auto mb-4 rounded-md opacity-50"
            />
            <h3 className="text-lg font-medium text-slate-950 mb-2">No projects yet</h3>
            <p className="text-sm text-slate-500 mb-6">Get started by creating your first Java project</p>
            <Button
              onClick={() => navigate('/projects/new')}
              className="bg-slate-900 hover:bg-slate-800 text-white"
              data-testid="empty-new-project-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="projects-grid">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-white border border-slate-200 rounded-md p-5 hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                data-testid={`project-card-${project.id}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-medium text-slate-950" data-testid={`project-name-${project.id}`}>{project.name}</h3>
                  <StatusBadge status={project.status} />
                </div>
                <p className="text-xs font-mono text-slate-500 mb-3 truncate" data-testid={`project-url-${project.id}`}>
                  {project.github_url}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    {project.branch}
                  </span>
                  {project.last_deployed && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(project.last_deployed).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{project.build_tool.toUpperCase()} • Java {project.java_version}</span>
                  {project.auto_deploy && (
                    <span className="text-emerald-600 font-medium">Auto-deploy</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
