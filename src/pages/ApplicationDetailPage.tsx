import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, FileText, Users, Clock, CheckCircle, XCircle, Eye, Edit, Save, Plus, Trash2, User, Calendar, MessageSquare, Shield, Settings, AlertTriangle, Search, Filter, ChevronDown, ChevronUp, Download, Upload, Star, Heart, Award, Target, Zap, Globe, Lock, Unlock, Mail, Phone, MapPin, Link as LinkIcon, ExternalLink, Copy, Check, X, Info, HelpCircle, BookOpen, Briefcase, GraduationCap, Building, UserPlus, UserMinus, UserCheck, UserX, Activity, TrendingUp, BarChart, PieChart, Layers, Grid, List, Table, Car as Card, Image, Video, Music, Headphones, Mic, Camera, Monitor, Smartphone, Tablet, Laptop, LampDesk as Desktop, Server, Database, Cloud, Wifi, Bluetooth, Battery, Power, Cpu, HardDrive, MemoryStick as Memory, Keyboard, Mouse, Printer, Scan as Scanner, Gamepad2, Joystick, Radio, Tv, Speaker, Volume2, VolumeX, Play, Pause, Store as Stop, SkipBack, SkipForward, Rewind, FastForward, Repeat, Shuffle, RotateCw, RotateCcw, RefreshCw, RefreshCcw, Maximize, Minimize, Move, Maximize as Resize, ZoomIn, ZoomOut, Focus, Crop, Scissors, PenTool, Brush, Palette, Pipette, Ruler, Compass, Triangle, Square, Circle, Hexagon, Pentagon, Octagon } from 'lucide-react';
import { applicationsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Question {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox';
  question: string;
  required: boolean;
  options?: string[];
}

interface Application {
  id: number;
  name: string;
  description: string;
  questions: Question[] | string | any;
  admin_role_id: string;
  moderator_role_id: string;
  accepted_roles: string[] | string | any;
  category: string;
  webhook_url: string;
  webhook_role_id: string;
  is_active: boolean;
  created_at: string;
  created_by_name: string;
}

interface Submission {
  id: number;
  user_id: number;
  status: string;
  responses: Record<string, any> | string | any;
  admin_notes: string;
  submitted_at: string;
  reviewed_at: string;
  reviewed_by: number;
  username: string;
  discriminator: string;
  discord_id: string;
  avatar: string;
  reviewed_by_name: string;
}

const APPLICATION_CATEGORIES = [
  'Emergency Services',
  'Civilian Services', 
  'Teams',
  'General'
];

// CRITICAL: Safe normalization functions to prevent .map() errors
const normalizeQuestions = (questions: any): Question[] => {
  if (Array.isArray(questions)) {
    return questions;
  }
  if (typeof questions === 'string') {
    try {
      const parsed = JSON.parse(questions);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (questions && typeof questions === 'object') {
    // If it's an object but not an array, try to convert
    const keys = Object.keys(questions);
    if (keys.length === 0) {
      return [];
    }
    // If it looks like an array-like object, try to convert
    if (keys.every(key => !isNaN(parseInt(key)))) {
      return Object.values(questions).filter(q => q && typeof q === 'object');
    }
  }
  return [];
};

const normalizeResponses = (responses: any): Record<string, any> => {
  if (typeof responses === 'string') {
    try {
      return JSON.parse(responses);
    } catch {
      return {};
    }
  }
  if (responses && typeof responses === 'object') {
    return responses;
  }
  return {};
};

const normalizeAcceptedRoles = (roles: any): string[] => {
  if (Array.isArray(roles)) {
    return roles;
  }
  if (typeof roles === 'string') {
    try {
      const parsed = JSON.parse(roles);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'apply';
  
  const [application, setApplication] = useState<Application | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Application form state
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Edit mode state
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    admin_role_id: '',
    moderator_role_id: '',
    accepted_roles: [''],
    category: 'General',
    webhook_url: '',
    webhook_role_id: '',
    is_active: true,
    questions: [] as Question[]
  });
  
  // Management state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSubmissions, setSelectedSubmissions] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Review modal state
  const [reviewingSubmission, setReviewingSubmission] = useState<Submission | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'accepted' | 'denied' | ''>('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  
  // Statistics state
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    denied: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get application details
        const applicationData = await applicationsAPI.getOne(id!);
        setApplication(applicationData);
        
        // Check for pending applications
        const submissions = await applicationsAPI.getMySubmissions(id!);
        const hasPendingSubmission = submissions.some((sub: any) => sub.status === 'pending');
        
        if (hasPendingSubmission && mode === 'apply') {
          navigate(`/applications/${id}/pending`);
          return;
        }
        
        // Normalize questions
        const questions = normalizeQuestions(applicationData.questions);
        
        if (mode === 'edit') {
          setEditData({
            name: applicationData.name,
            description: applicationData.description,
            admin_role_id: applicationData.admin_role_id || '',
            moderator_role_id: applicationData.moderator_role_id || '',
            accepted_roles: JSON.parse(applicationData.accepted_roles || '[]'),
            category: applicationData.category || 'General',
            webhook_url: applicationData.webhook_url || '',
            webhook_role_id: applicationData.webhook_role_id || '',
            is_active: applicationData.is_active,
            questions
          });
        }
        
        // Fetch submissions if in manage mode
        if (mode === 'manage') {
          const submissionsData = await applicationsAPI.getSubmissions(id!);
          const normalizedSubmissions = submissionsData.map((sub: any) => ({
            ...sub,
            responses: normalizeResponses(sub.responses)
          }));
          setSubmissions(normalizedSubmissions);
          
          // Calculate stats
          const total = normalizedSubmissions.length;
          const pending = normalizedSubmissions.filter((s: any) => s.status === 'pending').length;
          const accepted = normalizedSubmissions.filter((s: any) => s.status === 'accepted').length;
          const denied = normalizedSubmissions.filter((s: any) => s.status === 'denied').length;
          
          setStats({ total, pending, accepted, denied });
        }
      } catch (error) {
        console.error('Failed to fetch application:', error);
        navigate('/applications');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, mode, navigate]);

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear error when user provides input
    if (formErrors[questionId]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!application) return false;
    
    const questions = normalizeQuestions(application.questions);
    const errors: Record<string, string> = {};
    
    questions.forEach(question => {
      if (question.required) {
        const response = responses[question.id];
        if (!response || (Array.isArray(response) && response.length === 0) || 
            (typeof response === 'string' && !response.trim())) {
          errors[question.id] = 'This field is required';
        }
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !validateForm()) return;
    
    setSubmitting(true);
    try {
      await applicationsAPI.submit(id, responses);
      navigate('/applications?submitted=true');
    } catch (error: any) {
      console.error('Failed to submit application:', error);
      if (error.response?.data?.error === 'You already have a pending application for this form') {
        navigate(`/applications/${id}/pending`);
      } else {
        alert('Failed to submit application. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    setSaving(true);
    try {
      const updateData = {
        ...editData,
        accepted_roles: editData.accepted_roles.filter(role => role.trim() !== ''),
        questions: editData.questions.filter(q => q.question.trim() !== '')
      };
      
      await applicationsAPI.update(id, updateData);
      navigate('/applications?updated=true');
    } catch (error) {
      console.error('Failed to update application:', error);
      alert('Failed to update application. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReviewSubmission = async () => {
    if (!reviewingSubmission || !reviewDecision) return;
    
    setReviewSubmitting(true);
    try {
      await applicationsAPI.reviewSubmission(
        id!,
        reviewingSubmission.id.toString(),
        {
          status: reviewDecision,
          admin_notes: reviewNotes.trim()
        }
      );
      
      // Refresh submissions
      const submissionsData = await applicationsAPI.getSubmissions(id!);
      const normalizedSubmissions = submissionsData.map((sub: Submission) => ({
        ...sub,
        responses: normalizeResponses(sub.responses)
      }));
      setSubmissions(normalizedSubmissions);
      
      // Update stats
      const total = normalizedSubmissions.length;
      const pending = normalizedSubmissions.filter((s: Submission) => s.status === 'pending').length;
      const accepted = normalizedSubmissions.filter((s: Submission) => s.status === 'accepted').length;
      const denied = normalizedSubmissions.filter((s: Submission) => s.status === 'denied').length;
      setStats({ total, pending, accepted, denied });
      
      // Close modal
      setReviewingSubmission(null);
      setReviewDecision('');
      setReviewNotes('');
    } catch (error) {
      console.error('Failed to review submission:', error);
      alert('Failed to review submission. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: 'text',
      question: '',
      required: true,
      options: []
    };
    setEditData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setEditData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === id ? { ...q, [field]: value } : q
      )
    }));
  };

  const removeQuestion = (id: string) => {
    setEditData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id)
    }));
  };

  const addOption = (questionId: string) => {
    setEditData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId 
          ? { ...q, options: [...(q.options || []), ''] }
          : q
      )
    }));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setEditData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId 
          ? { 
              ...q, 
              options: q.options?.map((opt, i) => i === optionIndex ? value : opt) || []
            }
          : q
      )
    }));
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setEditData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId 
          ? { 
              ...q, 
              options: q.options?.filter((_, i) => i !== optionIndex) || []
            }
          : q
      )
    }));
  };

  const addAcceptedRole = () => {
    setEditData(prev => ({
      ...prev,
      accepted_roles: [...prev.accepted_roles, '']
    }));
  };

  const updateAcceptedRole = (index: number, value: string) => {
    setEditData(prev => ({
      ...prev,
      accepted_roles: prev.accepted_roles.map((role, i) => i === index ? value : role)
    }));
  };

  const removeAcceptedRole = (index: number) => {
    setEditData(prev => ({
      ...prev,
      accepted_roles: prev.accepted_roles.filter((_, i) => i !== index)
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'denied': return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default: return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'denied': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default: return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAvatarUrl = (avatar: string, userId: string) => {
    if (!avatar) return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = !searchTerm || 
      submission.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.discord_id.includes(searchTerm);
    const matchesStatus = !statusFilter || submission.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'name':
        aValue = a.username.toLowerCase();
        bValue = b.username.toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'date':
      default:
        aValue = new Date(a.submitted_at).getTime();
        bValue = new Date(b.submitted_at).getTime();
        break;
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const toggleSubmissionExpansion = (submissionId: number) => {
    setExpandedSubmissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(submissionId)) {
        newSet.delete(submissionId);
      } else {
        newSet.add(submissionId);
      }
      return newSet;
    });
  };

  const renderQuestionInput = (question: Question) => {
    const value = responses[question.id] || '';
    const hasError = !!formErrors[question.id];
    
    const baseInputClasses = `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
      hasError 
        ? 'border-red-300 dark:border-red-600' 
        : 'border-gray-300 dark:border-gray-600'
    }`;

    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            className={baseInputClasses}
            placeholder="Enter your answer..."
          />
        );
        
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            rows={4}
            className={`${baseInputClasses} resize-none`}
            placeholder="Enter your detailed answer..."
          />
        );
        
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            className={baseInputClasses}
          >
            <option value="">Select an option...</option>
            {(question.options || []).map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
        
      case 'radio':
        return (
          <div className="space-y-3">
            {(question.options || []).map((option, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-900 dark:text-white">{option}</span>
              </label>
            ))}
          </div>
        );
        
      case 'checkbox':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-3">
            {(question.options || []).map((option, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter(v => v !== option);
                    handleResponseChange(question.id, newValues);
                  }}
                  className="text-indigo-600 focus:ring-indigo-500 rounded"
                />
                <span className="text-gray-900 dark:text-white">{option}</span>
              </label>
            ))}
          </div>
        );
        
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Application not found</h2>
        <button
          onClick={() => navigate('/applications')}
          className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Return to applications
        </button>
      </div>
    );
  }

  // CRITICAL: Ensure questions is always an array before rendering
  const questions = normalizeQuestions(application.questions);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/applications')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {application.name}
          </h1>
          <div className="flex items-center space-x-4 mt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400">
              {application.category}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              application.is_active 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {application.is_active ? 'Active' : 'Inactive'}
            </span>
            {mode === 'manage' && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {questions.length} questions   {stats.total} submissions
              </span>
            )}
          </div>
        </div>
        
        {/* Mode-specific actions */}
        {mode === 'edit' && (
          <button
            onClick={handleEditSubmit}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {saving ? <LoadingSpinner /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Application Description */}
      {application.description && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {application.description}
          </p>
        </div>
      )}

      {/* Apply Mode */}
      {mode === 'apply' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Application Questions
            </h2>
            
            <div className="space-y-8">
              {questions.map((question, index) => (
                <div key={question.id} className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="flex items-center space-x-2">
                      <span>Question {index + 1}</span>
                      {question.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </span>
                    <span className="block mt-1 text-base font-normal">
                      {question.question}
                    </span>
                  </label>
                  
                  {renderQuestionInput(question)}
                  
                  {formErrors[question.id] && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {formErrors[question.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/applications')}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={submitting || !application.is_active}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {submitting ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Submit Application
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Manage Mode */}
      {mode === 'manage' && (
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Pending
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.pending}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Accepted
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.accepted}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Denied
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.denied}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search submissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="denied">Denied</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'status' | 'name')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="status">Sort by Status</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                {sortOrder === 'asc' ? (
                  <ChevronUp className="h-4 w-4 mr-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-2" />
                )}
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>
          </div>

          {/* Submissions List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Application Submissions ({sortedSubmissions.length})
              </h2>
            </div>
            
            {sortedSubmissions.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedSubmissions.map((submission) => (
                  <div key={submission.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <img
                          src={getAvatarUrl(submission.avatar, submission.discord_id)}
                          alt={submission.username}
                          className="h-10 w-10 rounded-full"
                        />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {submission.username}#{submission.discriminator}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>Submitted {formatDate(submission.submitted_at)}</span>
                            {submission.reviewed_at && (
                              <>
                                <span> </span>
                                <span>Reviewed {formatDate(submission.reviewed_at)}</span>
                              </>
                            )}
                            {submission.reviewed_by_name && (
                              <>
                                <span> </span>
                                <span>by {submission.reviewed_by_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                          {getStatusIcon(submission.status)}
                          <span className="ml-1">{submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}</span>
                        </span>
                        
                        <button
                          onClick={() => toggleSubmissionExpansion(submission.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                        >
                          {expandedSubmissions.has(submission.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        
                        {submission.status === 'pending' && (
                          <button
                            onClick={() => setReviewingSubmission(submission)}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    {expandedSubmissions.has(submission.id) && (
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="space-y-6">
                          {questions.map((question, index) => {
                            const response = submission.responses[question.id];
                            return (
                              <div key={question.id} className="space-y-2">
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  Question {index + 1}: {question.question}
                                </h4>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                  {Array.isArray(response) ? (
                                    <ul className="list-disc list-inside space-y-1">
                                      {response.map((item, i) => (
                                        <li key={i} className="text-gray-700 dark:text-gray-300">
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                      {response || 'No response provided'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {submission.admin_notes && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Admin Notes
                              </h4>
                              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {submission.admin_notes}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                  No submissions found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm || statusFilter
                    ? 'Try adjusting your filters'
                    : 'No applications have been submitted yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {mode === 'edit' && (
        <form onSubmit={handleEditSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Application Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={editData.category}
                  onChange={(e) => setEditData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {APPLICATION_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>
            
            <div className="mt-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editData.is_active}
                  onChange={(e) => setEditData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Application is active and accepting submissions
                </span>
              </label>
            </div>
          </div>

          {/* Role Configuration */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Role Configuration
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="admin_role_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Role ID
                </label>
                <input
                  type="text"
                  id="admin_role_id"
                  value={editData.admin_role_id}
                  onChange={(e) => setEditData(prev => ({ ...prev, admin_role_id: e.target.value }))}
                  placeholder="Discord role ID for admins"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label htmlFor="moderator_role_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Moderator Role ID
                </label>
                <input
                  type="text"
                  id="moderator_role_id"
                  value={editData.moderator_role_id}
                  onChange={(e) => setEditData(prev => ({ ...prev, moderator_role_id: e.target.value }))}
                  placeholder="Discord role ID for moderators"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Roles to Assign When Accepted
              </label>
              {editData.accepted_roles.map((role, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => updateAcceptedRole(index, e.target.value)}
                    placeholder="Discord role ID"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {editData.accepted_roles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAcceptedRole(index)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addAcceptedRole}
                className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Role
              </button>
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Discord Webhook Configuration
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="webhook_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Webhook URL
                </label>
                <input
                  type="url"
                  id="webhook_url"
                  value={editData.webhook_url}
                  onChange={(e) => setEditData(prev => ({ ...prev, webhook_url: e.target.value }))}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label htmlFor="webhook_role_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role ID to Ping
                </label>
                <input
                  type="text"
                  id="webhook_role_id"
                  value={editData.webhook_role_id}
                  onChange={(e) => setEditData(prev => ({ ...prev, webhook_role_id: e.target.value }))}
                  placeholder="Discord role ID"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Application Questions
              </h2>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </button>
            </div>
            
            <div className="space-y-6">
              {editData.questions.map((question, index) => (
                <div key={question.id} className="p-6 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Question {index + 1}
                    </h3>
                    {editData.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Question Type
                      </label>
                      <select
                        value={question.type}
                        onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="select">Dropdown</option>
                        <option value="radio">Multiple Choice</option>
                        <option value="checkbox">Checkboxes</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) => updateQuestion(question.id, 'required', e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Required</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Question Text
                    </label>
                    <input
                      type="text"
                      value={question.question}
                      onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                      placeholder="Enter your question..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  {(question.type === 'select' || question.type === 'radio' || question.type === 'checkbox') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Options
                      </label>
                      {(question.options || []).map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2 mb-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                            placeholder={`Option ${optionIndex + 1}`}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(question.id, optionIndex)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(question.id)}
                        className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Option
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/applications')}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {saving ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Review Modal */}
      {reviewingSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img
                    src={getAvatarUrl(reviewingSubmission.avatar, reviewingSubmission.discord_id)}
                    alt={reviewingSubmission.username}
                    className="h-12 w-12 rounded-full"
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Review Application
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {reviewingSubmission.username}#{reviewingSubmission.discriminator}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReviewingSubmission(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Application Responses */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Application Responses
                </h3>
                {questions.map((question, index) => {
                  const response = reviewingSubmission.responses[question.id];
                  return (
                    <div key={question.id} className="space-y-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Question {index + 1}: {question.question}
                      </h4>
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        {Array.isArray(response) ? (
                          <ul className="list-disc list-inside space-y-1">
                            {response.map((item, i) => (
                              <li key={i} className="text-gray-700 dark:text-gray-300">
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {response || 'No response provided'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Review Decision */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Review Decision
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setReviewDecision('accepted')}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      reviewDecision === 'accepted'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-gray-900 dark:text-white">Accept</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setReviewDecision('denied')}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      reviewDecision === 'denied'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-red-300'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-gray-900 dark:text-white">Deny</span>
                    </div>
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Review Notes (Optional)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add any notes about your decision..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setReviewingSubmission(null)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleReviewSubmission}
                  disabled={reviewSubmitting || !reviewDecision}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {reviewSubmitting ? (
                    <>
                      <LoadingSpinner />
                      <span className="ml-2">Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Submit Review
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};