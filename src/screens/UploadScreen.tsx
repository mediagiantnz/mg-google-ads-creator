import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card, { CardContent, CardHeader, CardTitle } from '../components/Card';
import Alert from '../components/Alert';
import { parseMDFile, validateMDContent } from '../utils/mdParser';
import api from '../services/api';
import { isApiSuccessResponse } from '../types';

export const UploadScreen: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.md')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please upload a Markdown (.md) file');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.md')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please upload a Markdown (.md) file');
      }
    }
  };

  const handleSubmit = async () => {
    if (!file || !accountId) {
      setError('Please upload a file and enter an account ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const content = await file.text();
      
      // Validate MD content
      const validation = validateMDContent(content);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file format');
        setLoading(false);
        return;
      }

      // Parse campaigns locally for preview
      const campaigns = parseMDFile(content);
      
      // Send to API
      const response = await api.parseFile(content, accountId);
      
      if (isApiSuccessResponse(response)) {
        // Store data in sessionStorage for preview screen
        sessionStorage.setItem('jobData', JSON.stringify({
          jobId: response.data.jobId,
          accountId: accountId,
          campaigns: campaigns,
        }));
        
        navigate('/preview');
      } else {
        setError(response.error.message);
      }
    } catch (err) {
      setError('Failed to process file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Google Ads Campaign Creator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert type="error" message={error} onClose={() => setError(null)} />
            )}
            
            <div 
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".md"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              
              <p className="mt-2 text-sm text-gray-600">
                {file ? (
                  <span className="font-medium text-blue-600">{file.name}</span>
                ) : (
                  <>
                    <span className="font-medium">Drop MD file here</span> or click to browse
                  </>
                )}
              </p>
            </div>
            
            <div>
              <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-2">
                Google Ads Account ID
              </label>
              <input
                type="text"
                id="accountId"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="e.g., 7884275629"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={!file || !accountId}
              isLoading={loading}
              className="w-full"
            >
              Parse & Preview
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};