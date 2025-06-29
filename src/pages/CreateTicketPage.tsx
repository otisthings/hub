import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { ticketsAPI, categoriesAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchableSelect } from '../components/SearchableSelect';

interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
}

export const CreateTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '' // Start with empty string - no default selection
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoriesAPI.getAccessibleCategories();
        setCategories(data);
        // REMOVED: No default category selection
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await ticketsAPI.create({
        ...formData,
        category_id: parseInt(formData.category_id)
      });
      navigate(`/tickets/${result.id}`);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      setErrors({ submit: 'Failed to create ticket. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCategoryChange = (categoryId: string | number) => {
    setFormData(prev => ({
      ...prev,
      category_id: categoryId.toString()
    }));
    
    // Clear category error when user selects
    if (errors.category_id) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.category_id;
        return newErrors;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const categoryOptions = categories.map(category => ({
    id: category.id.toString(),
    name: category.name,
    description: category.description,
    color: category.color
  }));

  const selectedCategory = categories.find(c => c.id.toString() === formData.category_id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/tickets')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create New Ticket
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Describe your issue and we'll help you resolve it
          </p>
        </div>
      </div>

      {/* Global Error Message */}
      {errors.submit && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 text-sm">{errors.submit}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ticket Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Brief description of your issue"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                  errors.title 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              {errors.title && (
                <p id="title-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={categoryOptions}
                value={formData.category_id}
                onChange={handleCategoryChange}
                placeholder="Select a category"
                className={`w-full ${
                  errors.category_id 
                    ? 'border-red-300 dark:border-red-600' 
                    : ''
                }`}
              />
              {errors.category_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.category_id}
                </p>
              )}
              {selectedCategory?.description && !errors.category_id && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {selectedCategory.description}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={8}
              placeholder="Please provide detailed information about your issue, including any steps to reproduce the problem and what you expected to happen."
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none ${
                errors.description 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              aria-describedby={errors.description ? 'description-error' : undefined}
            />
            {errors.description && (
              <p id="description-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {submitting ? (
              <>
                <LoadingSpinner />
                <span className="ml-2">Creating...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Create Ticket
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};