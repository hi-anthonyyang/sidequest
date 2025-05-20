'use client';

import { useState, useRef } from 'react';
import { PaperClipIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import InfoIcon from '@/components/icons/InfoIcon';
import CopyIcon from '@/components/icons/CopyIcon';

const DIFFERENTIATION_STRATEGIES = [
  { id: 'simplify', label: 'Simplify Language', tooltip: 'Use easier words and shorter sentences.' },
  { id: 'scaffold', label: 'Scaffold Questions', tooltip: 'Break down tasks or add guiding questions.' },
  { id: 'rigor', label: 'Increase Rigor', tooltip: 'Make the assignment more challenging.' },
];

const MAX_ASSIGNMENTS = 50;

export default function AssignmentsPage() {
  const [assignment, setAssignment] = useState('');
  const [numVariations, setNumVariations] = useState(1);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [variations, setVariations] = useState<Array<{ text: string; title: string }>>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stayOnTopic, setStayOnTopic] = useState(false);
  const [assignmentsLeft, setAssignmentsLeft] = useState(MAX_ASSIGNMENTS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setVariations([]);
    setError(null);
    try {
      const response = await fetch('/api/differentiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignment,
          strategies: selectedStrategies,
          numVariations,
          stayOnTopic,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to generate variations');
      }
      const data = await response.json();
      if (!data.variations || !Array.isArray(data.variations)) {
        throw new Error('Invalid response format: variations array missing');
      }
      setVariations(data.variations);
      setAssignmentsLeft((prev) => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Error generating variations:', error);
      setError(error.message || 'Failed to generate variations. Please try again.');
      alert('Failed to generate variations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white font-sans">
      <div className="container mx-auto px-4 pt-10 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight leading-[1.1]">
              Forge Different Assignments
            </h1>
            <div className="mt-4 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-snug tracking-wide text-center">
              Create differentiated assignments for all learners.
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left Pane: Input */}
            <div className="md:w-1/2 w-full bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col">
              <form onSubmit={handleSubmit} className="space-y-8 text-left flex-1 flex flex-col">
                {/* Assignment Input with Paperclip */}
                <div className="relative">
                  {/* Subtle assignments left indicator */}
                  <div className="absolute top-2 right-2 flex items-center space-x-1 text-xs text-gray-400 z-10">
                    <span>{assignmentsLeft} / {MAX_ASSIGNMENTS}</span>
                    <Image src="/icons/scroll-text.svg" alt="Assignments left" width={14} height={14} className="w-3.5 h-3.5" />
                  </div>
                  <label htmlFor="assignment" className="block text-sm font-medium text-gray-700 mb-2">
                    Original Assignment
                  </label>
                  <textarea
                    id="assignment"
                    value={assignment}
                    onChange={(e) => setAssignment(e.target.value)}
                    className="w-full min-h-[120px] p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-base bg-white placeholder-gray-500 text-gray-900"
                    placeholder="Paste your assignment here..."
                    required
                  />
                  {/* Paperclip Icon Button */}
                  <button
                    type="button"
                    aria-label="Attach file"
                    onClick={handlePaperclipClick}
                    className="absolute left-3 bottom-3 p-1 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    tabIndex={0}
                  >
                    <PaperClipIcon className="w-4.5 h-4.5 text-gray-400" style={{ width: '18px', height: '18px' }} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                    className="hidden"
                    tabIndex={-1}
                  />
                </div>
                {/* Number of Variations */}
                <div>
                  <label htmlFor="variations" className="block text-sm font-medium text-gray-700 mb-2">
                    How many versions?
                  </label>
                  <select
                    id="variations"
                    value={numVariations}
                    onChange={(e) => setNumVariations(Number(e.target.value))}
                    className="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
                  >
                    {[1, 2, 3].map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Differentiation Strategies */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Differentiation Strategies
                  </label>
                  <div className="space-y-2">
                    {DIFFERENTIATION_STRATEGIES.map((strategy) => (
                      <div key={strategy.id} className="flex items-center space-x-2 relative">
                        <input
                          id={`strategy-${strategy.id}`}
                          type="checkbox"
                          checked={selectedStrategies.includes(strategy.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStrategies([...selectedStrategies, strategy.id]);
                            } else {
                              setSelectedStrategies(selectedStrategies.filter(id => id !== strategy.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor={`strategy-${strategy.id}`} className="text-sm text-gray-700 select-none cursor-default">
                          {strategy.label}
                        </label>
                        <span className="relative flex items-center">
                          <span
                            className="ml-0.5 cursor-default info-tooltip-trigger"
                            aria-label={`Info about ${strategy.label}`}
                            tabIndex={-1}
                          >
                            <InfoIcon className="w-3 h-3 text-gray-400 align-middle" />
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-max max-w-xs px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 pointer-events-none info-tooltip transition-opacity z-10 whitespace-pre-line"
                              style={{ minWidth: '120px' }}
                            >
                              {strategy.tooltip}
                            </span>
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Stay on Topic Checkbox */}
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    id="stayOnTopic"
                    type="checkbox"
                    checked={stayOnTopic}
                    onChange={e => setStayOnTopic(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="stayOnTopic" className="text-sm text-gray-700 select-none cursor-default">
                    Keep assignment strictly on the original topic and learning objectives
                  </label>
                </div>
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !assignment.trim()}
                  className="inline-flex items-center justify-center gap-3 bg-blue-600 text-white px-10 py-3 rounded-lg text-base font-medium tracking-wide hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 w-full"
                >
                  <span className="flex items-center gap-2">
                    <Image
                      src="/icons/wand-sparkles.svg"
                      alt="Wand Sparkles"
                      width={20}
                      height={20}
                      className="w-5 h-5 brightness-0 invert"
                    />
                    {isLoading ? 'Generating...' : 'Generate Variations'}
                  </span>
                </button>
              </form>
            </div>
            {/* Right Pane: Output */}
            <div className="md:w-1/2 w-full bg-gray-50 border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col overflow-auto max-h-[80vh] min-h-[300px]">
              {error ? (
                <div className="text-red-600 text-center py-4">{error}</div>
              ) : variations.length > 0 ? (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Generated Variations</h2>
                  <div className="flex flex-col gap-4 overflow-y-auto max-h-[60vh] pr-2">
                    {variations.map((variation, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-900">{variation.title}</h3>
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(variation.text);
                              setCopiedIndex(index);
                              setTimeout(() => setCopiedIndex(null), 1200);
                            }}
                            className="text-blue-600 hover:text-blue-700 transition-all duration-200 flex items-center min-w-[60px] min-h-[24px] justify-end"
                            aria-label="Copy variation to clipboard"
                          >
                            {copiedIndex === index ? (
                              <span className="animate-fade-in text-green-600 font-medium text-sm w-5 h-5 flex items-center justify-end" style={{ fontSize: '0.75rem' }}>Copied!</span>
                            ) : (
                              <CopyIcon className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        <p className="text-gray-700 mb-2 whitespace-pre-line">{variation.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <span className="text-2xl">🪄</span>
                  <span className="mt-2">Your generated variations will appear here.</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <style jsx global>{`
          .info-tooltip-trigger:hover .info-tooltip,
          .info-tooltip-trigger:focus .info-tooltip {
            opacity: 1 !important;
            pointer-events: auto;
          }
          .animate-fade-in {
            animation: fadeInOut 1.2s;
          }
          @keyframes fadeInOut {
            0% { opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </div>
    </main>
  );
} 