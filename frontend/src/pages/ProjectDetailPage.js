import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  ArrowLeft, 
  GitBranch, 
  Rocket, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Plus,
  Trash2,
  Settings,
  Globe,
  Key,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';

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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`} data-testid={`project-status-${status}`}>
      <Icon className={`w-3 h-3 ${status === 'building' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
};

export const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [envVars, setEnvVars] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, deploymentsRes, envRes, domainsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/projects/${projectId}`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/projects/${projectId}/deployments`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/projects/${projectId}/env`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/projects/${projectId}/domains`, { withCredentials: true })
      ]);

      setProject(projectRes.data);
      setDeployments(deploymentsRes.data);
      setEnvVars(envRes.data);
      setDomains(domainsRes.data);
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/deployments`,
        { project_id: projectId },
        { withCredentials: true }
      );
      
      // Auto-complete after 5 seconds (simulated)
      setTimeout(async () => {
        await axios.post(
          `${BACKEND_URL}/api/deployments/${data.id}/complete`,
          {},
          { withCredentials: true }
        );
        await fetchProjectData();
        setDeploying(false);
      }, 5000);
    } catch (error) {
      console.error('Error deploying:', error);
      setDeploying(false);
    }
  };

  const handleAddEnvVar = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${BACKEND_URL}/api/projects/${projectId}/env`,
        { key: newEnvKey, value: newEnvValue },
        { withCredentials: true }
      );
      setNewEnvKey('');
      setNewEnvValue('');
      await fetchProjectData();
    } catch (error) {
      console.error('Error adding env var:', error);
    }
  };

  const handleDeleteEnvVar = async (envId) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/projects/${projectId}/env/${envId}`, {
        withCredentials: true
      });
      await fetchProjectData();
    } catch (error) {
      console.error('Error deleting env var:', error);
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${BACKEND_URL}/api/projects/${projectId}/domains`,
        { domain: newDomain },
        { withCredentials: true }
      );
      setNewDomain('');
      await fetchProjectData();
    } catch (error) {
      console.error('Error adding domain:', error);
    }
  };

  const handleDeleteDomain = async (domainId) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/projects/${projectId}/domains/${domainId}`, {
        withCredentials: true
      });
      await fetchProjectData();
    } catch (error) {
      console.error('Error deleting domain:', error);
    }
  };

  const handleDeleteProject = async () => {
    try {
      await axios.delete(`${BACKEND_URL}/api/projects/${projectId}`, {
        withCredentials: true
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleCopyUrl = async () => {
    if (project?.deployment_url) {
      await navigator.clipboard.writeText(project.deployment_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <GitBranch className="w-6 h-6 text-slate-900" />
              <h1 className="text-xl font-semibold tracking-tight text-slate-950">JavaHost</h1>
            </div>
            <span className="text-sm text-slate-500">{user?.email}</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6 text-slate-700 hover:text-slate-900"
          data-testid="back-to-dashboard-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Project Header */}
        <div className="bg-white border border-slate-200 rounded-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 mb-2" data-testid="project-detail-name">{project.name}</h2>
              <p className="text-sm font-mono text-slate-500" data-testid="project-detail-url">{project.github_url}</p>
            </div>
            <StatusBadge status={project.status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 text-sm">
            <div>
              <span className="text-slate-500">Branch</span>
              <p className="font-medium text-slate-950 mt-1">{project.branch}</p>
            </div>
            <div>
              <span className="text-slate-500">Build Tool</span>
              <p className="font-medium text-slate-950 mt-1">{project.build_tool.toUpperCase()}</p>
            </div>
            <div>
              <span className="text-slate-500">Java Version</span>
              <p className="font-medium text-slate-950 mt-1">{project.java_version}</p>
            </div>
            <div>
              <span className="text-slate-500">Auto Deploy</span>
              <p className="font-medium text-slate-950 mt-1">{project.auto_deploy ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <Button
              onClick={handleDeploy}
              disabled={deploying || project.status === 'building'}
              className="bg-slate-900 hover:bg-slate-800 text-white"
              data-testid="deploy-button"
            >
              {deploying || project.status === 'building' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Deploy Now
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Live Deployment URL Banner */}
        {project.deployment_url && project.status === 'deployed' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-md p-5 mb-6" data-testid="deployment-url-banner">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-medium text-emerald-900">Live Deployment</h3>
                </div>
                <p className="text-xs text-emerald-700 mb-3">Your backend application is live and accessible at:</p>
                <a
                  href={project.deployment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-emerald-900 hover:text-emerald-700 underline break-all"
                  data-testid="deployment-url-link"
                >
                  {project.display_url || project.deployment_url}
                </a>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  onClick={handleCopyUrl}
                  variant="outline"
                  size="sm"
                  className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  data-testid="copy-url-button"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy URL
                    </>
                  )}
                </Button>
                <a
                  href={project.deployment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="open-app-button"
                >
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open App
                  </Button>
                </a>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-emerald-700">API Endpoint</span>
                <p className="font-mono text-emerald-900 mt-1 truncate">/api</p>
              </div>
              <div>
                <span className="text-emerald-700">Health Check</span>
                <p className="font-mono text-emerald-900 mt-1 truncate">/actuator/health</p>
              </div>
              <div>
                <span className="text-emerald-700">Port</span>
                <p className="font-mono text-emerald-900 mt-1">8080</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="deployments" className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1" data-testid="project-tabs">
            <TabsTrigger value="deployments" className="data-[state=active]:bg-slate-100" data-testid="deployments-tab">Deployments</TabsTrigger>
            <TabsTrigger value="env" className="data-[state=active]:bg-slate-100" data-testid="env-tab">Environment</TabsTrigger>
            <TabsTrigger value="domains" className="data-[state=active]:bg-slate-100" data-testid="domains-tab">Domains</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-slate-100" data-testid="settings-tab">Settings</TabsTrigger>
          </TabsList>

          {/* Deployments Tab */}
          <TabsContent value="deployments" className="mt-6">
            <div className="bg-white border border-slate-200 rounded-md">
              {deployments.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-sm text-slate-500">No deployments yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {deployments.map((deployment) => (
                    <div key={deployment.id} className="p-6" data-testid={`deployment-${deployment.id}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <StatusBadge status={deployment.status} />
                          <p className="text-xs text-slate-500 mt-2">
                            Started: {new Date(deployment.started_at).toLocaleString()}
                          </p>
                          {deployment.completed_at && (
                            <p className="text-xs text-slate-500">
                              Completed: {new Date(deployment.completed_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Build Logs */}
                      <div className="bg-slate-950 rounded-md border border-slate-800 overflow-hidden font-mono mt-4">
                        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800">
                          <span className="text-xs text-slate-400">Build Logs</span>
                        </div>
                        <div className="text-slate-300 text-[13px] leading-relaxed p-4 h-[300px] overflow-y-auto terminal-logs" data-testid="build-logs">
                          {deployment.logs.map((log, idx) => (
                            <div key={idx} className="mb-1">
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Environment Variables Tab */}
          <TabsContent value="env" className="mt-6">
            <div className="bg-white border border-slate-200 rounded-md p-6">
              <h3 className="text-lg font-medium text-slate-950 mb-4 flex items-center gap-2">
                <Key className="w-5 h-5" />
                Environment Variables
              </h3>

              <form onSubmit={handleAddEnvVar} className="mb-6 p-4 bg-slate-50 rounded-md border border-slate-200" data-testid="add-env-form">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="env-key" className="text-sm font-medium text-slate-950">Key</Label>
                    <Input
                      id="env-key"
                      value={newEnvKey}
                      onChange={(e) => setNewEnvKey(e.target.value)}
                      placeholder="DATABASE_URL"
                      className="mt-1 font-mono text-sm"
                      data-testid="env-key-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="env-value" className="text-sm font-medium text-slate-950">Value</Label>
                    <Input
                      id="env-value"
                      value={newEnvValue}
                      onChange={(e) => setNewEnvValue(e.target.value)}
                      placeholder="postgresql://..."
                      className="mt-1 font-mono text-sm"
                      data-testid="env-value-input"
                    />
                  </div>
                </div>
                <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="add-env-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Variable
                </Button>
              </form>

              <div className="space-y-2">
                {envVars.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No environment variables configured</p>
                ) : (
                  envVars.map((env) => (
                    <div
                      key={env.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-md border border-slate-200"
                      data-testid={`env-var-${env.id}`}
                    >
                      <div className="flex-1 font-mono text-sm">
                        <span className="text-slate-700 font-medium">{env.key}</span>
                        <span className="text-slate-400 mx-2">=</span>
                        <span className="text-slate-500">{env.value}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEnvVar(env.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`delete-env-${env.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Domains Tab */}
          <TabsContent value="domains" className="mt-6">
            <div className="bg-white border border-slate-200 rounded-md p-6">
              <h3 className="text-lg font-medium text-slate-950 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Custom Domains
              </h3>

              <form onSubmit={handleAddDomain} className="mb-6 p-4 bg-slate-50 rounded-md border border-slate-200" data-testid="add-domain-form">
                <div className="mb-4">
                  <Label htmlFor="domain" className="text-sm font-medium text-slate-950">Domain</Label>
                  <Input
                    id="domain"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="example.com"
                    className="mt-1 font-mono text-sm"
                    data-testid="domain-input"
                  />
                </div>
                <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="add-domain-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Domain
                </Button>
              </form>

              <div className="space-y-2">
                {domains.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No custom domains configured</p>
                ) : (
                  domains.map((domain) => (
                    <div
                      key={domain.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-md border border-slate-200"
                      data-testid={`domain-${domain.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-slate-700">{domain.domain}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${domain.verified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {domain.verified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDomain(domain.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`delete-domain-${domain.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="bg-white border border-slate-200 rounded-md p-6">
              <h3 className="text-lg font-medium text-slate-950 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Project Settings
              </h3>

              <div className="space-y-6">
                <div className="p-4 bg-red-50 rounded-md border border-red-200">
                  <h4 className="text-sm font-medium text-red-900 mb-2">Danger Zone</h4>
                  <p className="text-sm text-red-700 mb-4">
                    Deleting a project will remove all deployments, environment variables, and domains. This action cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" data-testid="delete-project-button">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Project
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the project "{project.name}" and all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="cancel-delete-button">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteProject} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-button">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
