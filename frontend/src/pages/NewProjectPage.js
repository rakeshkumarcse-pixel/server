import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, GitBranch } from 'lucide-react';
import { Switch } from '../components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const NewProjectPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    github_url: '',
    branch: 'main',
    build_tool: 'maven',
    java_version: '17',
    auto_deploy: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/projects`,
        formData,
        { withCredentials: true }
      );
      navigate(`/projects/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6 text-slate-700 hover:text-slate-900"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="bg-white border border-slate-200 rounded-md p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 mb-2" data-testid="new-project-title">Create New Project</h2>
          <p className="text-sm text-slate-500 mb-8">Deploy your Java & Spring Boot application from GitHub</p>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="new-project-form">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-slate-950">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="mt-1"
                data-testid="project-name-input"
                placeholder="my-spring-app"
              />
            </div>

            <div>
              <Label htmlFor="github_url" className="text-sm font-medium text-slate-950">GitHub Repository URL</Label>
              <Input
                id="github_url"
                value={formData.github_url}
                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                required
                className="mt-1 font-mono text-sm"
                data-testid="github-url-input"
                placeholder="https://github.com/username/repo"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="branch" className="text-sm font-medium text-slate-950">Branch</Label>
                <Input
                  id="branch"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  required
                  className="mt-1"
                  data-testid="branch-input"
                  placeholder="main"
                />
              </div>

              <div>
                <Label htmlFor="build_tool" className="text-sm font-medium text-slate-950">Build Tool</Label>
                <Select
                  value={formData.build_tool}
                  onValueChange={(value) => setFormData({ ...formData, build_tool: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="build-tool-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maven" data-testid="build-tool-maven">Maven</SelectItem>
                    <SelectItem value="gradle" data-testid="build-tool-gradle">Gradle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="java_version" className="text-sm font-medium text-slate-950">Java Version</Label>
              <Select
                value={formData.java_version}
                onValueChange={(value) => setFormData({ ...formData, java_version: value })}
              >
                <SelectTrigger className="mt-1" data-testid="java-version-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="11" data-testid="java-version-11">Java 11</SelectItem>
                  <SelectItem value="17" data-testid="java-version-17">Java 17</SelectItem>
                  <SelectItem value="21" data-testid="java-version-21">Java 21</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-md border border-slate-200">
              <div>
                <Label htmlFor="auto_deploy" className="text-sm font-medium text-slate-950">Auto Deploy</Label>
                <p className="text-xs text-slate-500 mt-1">Automatically deploy on GitHub push</p>
              </div>
              <Switch
                id="auto_deploy"
                checked={formData.auto_deploy}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_deploy: checked })}
                data-testid="auto-deploy-switch"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm" data-testid="error-message">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
                data-testid="cancel-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
                data-testid="create-project-button"
              >
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
