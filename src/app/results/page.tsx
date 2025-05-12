'use client';

import { useState, useEffect } from 'react';
import { AssessmentResults } from '@/lib/types';
import { Disclosure } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/24/outline';
import { jsPDF } from 'jspdf';
import Image from 'next/image';

export default function ResultsPage() {
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you would fetch the results from your API
    // For now, we'll simulate loading the results from localStorage
    const storedResults = localStorage.getItem('assessmentResults');
    if (storedResults) {
      setResults(JSON.parse(storedResults));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your recommendations...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No results found. Please complete the assessment first.</p>
        </div>
      </div>
    );
  }

  const handleDownloadPDF = () => {
    if (!results) return;
    const doc = new jsPDF();
    const topMargin = 20;
    const bottomMargin = 20;
    const leftMargin = 0;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = topMargin;

    // Helper to check for page break
    function ensurePageSpace(linesNeeded = 1) {
      if (y + linesNeeded * lineHeight > pageHeight - bottomMargin) {
        doc.addPage();
        y = topMargin;
      }
    }

    // Add small logo and discreet Sidequest text in top-left
    doc.addImage('/icons/sidequest_logo.png', 'PNG', leftMargin, y, 8, 8); // 8x8px, top-left
    doc.setFontSize(10);
    doc.text('Sidequest', leftMargin + 12, y + 6, { align: 'left' });
    y += 14;
    doc.setFontSize(16);
    doc.text('Your Personalized Recommendations', pageWidth / 2, y, { align: 'center' });
    y += 15;

    const maxWidth = 170;
    const lineHeight = 6;

    // Majors
    doc.setFontSize(14);
    ensurePageSpace();
    doc.text('Recommended Majors:', 15, y);
    y += 8;
    doc.setFontSize(11);
    results.majors.forEach((major) => {
      ensurePageSpace();
      doc.text(`• ${major.name} (${major.department})`, 18, y);
      y += lineHeight;
      const descLines = doc.splitTextToSize(major.description, maxWidth);
      ensurePageSpace(descLines.length);
      doc.text(descLines, 22, y);
      y += descLines.length * lineHeight;
      if (major.requirements && major.requirements.length > 0) {
        const reqText = 'Requirements: ' + major.requirements.join(', ');
        const reqLines = doc.splitTextToSize(reqText, maxWidth);
        ensurePageSpace(reqLines.length);
        doc.text(reqLines, 22, y);
        y += reqLines.length * lineHeight;
      }
      y += 2;
    });
    y += 4;

    // Careers
    doc.setFontSize(14);
    ensurePageSpace();
    doc.text('Career Paths:', 15, y);
    y += 8;
    doc.setFontSize(11);
    results.careers.forEach((career) => {
      ensurePageSpace();
      doc.text(`• ${career.title}`, 18, y);
      y += lineHeight;
      const descLines = doc.splitTextToSize(career.description, maxWidth);
      ensurePageSpace(descLines.length);
      doc.text(descLines, 22, y);
      y += descLines.length * lineHeight;
      const relMajors = 'Related Majors: ' + career.relatedMajors.join(', ');
      const relMajorsLines = doc.splitTextToSize(relMajors, maxWidth);
      ensurePageSpace(relMajorsLines.length);
      doc.text(relMajorsLines, 22, y);
      y += relMajorsLines.length * lineHeight;
      if (career.salary) {
        const salaryText = `Salary Range: $${career.salary.min.toLocaleString()} - $${career.salary.max.toLocaleString()}`;
        ensurePageSpace();
        doc.text(salaryText, 22, y);
        y += lineHeight;
      }
      y += 2;
    });
    y += 4;

    // Organizations
    doc.setFontSize(14);
    ensurePageSpace();
    doc.text('Student Organizations:', 15, y);
    y += 8;
    doc.setFontSize(11);
    results.organizations.forEach((org) => {
      ensurePageSpace();
      doc.text(`• ${org.name} (${org.category})`, 18, y);
      y += lineHeight;
      const descLines = doc.splitTextToSize(org.description, maxWidth);
      ensurePageSpace(descLines.length);
      doc.text(descLines, 22, y);
      y += descLines.length * lineHeight;
      if (org.website) {
        const webLines = doc.splitTextToSize('Website: ' + org.website, maxWidth);
        ensurePageSpace(webLines.length);
        doc.text(webLines, 22, y);
        y += webLines.length * lineHeight;
      }
      y += 2;
    });
    y += 4;

    // Events
    doc.setFontSize(14);
    ensurePageSpace();
    doc.text('Upcoming Events:', 15, y);
    y += 8;
    doc.setFontSize(11);
    results.events.forEach((event) => {
      ensurePageSpace();
      doc.text(`• ${event.name} (${event.category})`, 18, y);
      y += lineHeight;
      const descLines = doc.splitTextToSize(event.description, maxWidth);
      ensurePageSpace(descLines.length);
      doc.text(descLines, 22, y);
      y += descLines.length * lineHeight;
      const dateLoc = `Date: ${event.date} | Location: ${event.location}`;
      const dateLocLines = doc.splitTextToSize(dateLoc, maxWidth);
      ensurePageSpace(dateLocLines.length);
      doc.text(dateLocLines, 22, y);
      y += dateLocLines.length * lineHeight;
      y += 2;
    });

    doc.save('sidequest-results.pdf');
  };

  const handleStartOver = () => {
    localStorage.removeItem('assessmentResults');
    window.location.href = '/';
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
            Your Personalized Recommendations
          </h1>

          {/* Majors Section */}
          <div className="mb-8">
            <Disclosure defaultOpen>
              {({ open }) => (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <Disclosure.Button className="w-full px-6 py-4 text-left bg-blue-600 text-white font-semibold flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <Image src="/icons/book-open.svg" alt="Majors" width={20} height={20} className="filter invert brightness-200" />
                      Recommended Majors
                    </span>
                    <ChevronUpIcon
                      className={`${
                        open ? 'transform rotate-180' : ''
                      } w-5 h-5 transition-transform duration-200`}
                    />
                  </Disclosure.Button>
                  <Disclosure.Panel className="px-6 py-4">
                    <div className="space-y-6">
                      {results.majors.map((major, index) => (
                        <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {major.name}
                            {major.department && major.department !== 'N/A' && (
                              <span className="text-sm text-gray-500"> ({major.department})</span>
                            )}
                          </h3>
                          {major.description && major.description !== 'N/A' && (
                            <p className="text-gray-600 mb-2">{major.description}</p>
                          )}
                          {major.department && major.department !== 'N/A' && (
                            <p className="text-sm text-gray-500">Department: {major.department}</p>
                          )}
                          {major.requirements && major.requirements.length > 0 && major.requirements[0] !== 'N/A' && (
                            <div className="mt-2">
                              <h4 className="text-sm font-semibold text-gray-700">Requirements:</h4>
                              <ul className="list-disc list-inside text-sm text-gray-600">
                                {major.requirements.map((req, i) => req && req !== 'N/A' && <li key={i}>{req}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Disclosure.Panel>
                </div>
              )}
            </Disclosure>
          </div>

          {/* Careers Section */}
          <div className="mb-8">
            <Disclosure>
              {({ open }) => (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <Disclosure.Button className="w-full px-6 py-4 text-left bg-blue-600 text-white font-semibold flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <Image src="/icons/briefcase-business.svg" alt="Careers" width={20} height={20} className="filter invert brightness-200" />
                      Career Paths
                    </span>
                    <ChevronUpIcon
                      className={`${
                        open ? 'transform rotate-180' : ''
                      } w-5 h-5 transition-transform duration-200`}
                    />
                  </Disclosure.Button>
                  <Disclosure.Panel className="px-6 py-4">
                    <div className="space-y-6">
                      {results.careers.map((career, index) => (
                        <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {career.title}
                          </h3>
                          {career.description && career.description !== 'N/A' && (
                            <p className="text-gray-600 mb-2">{career.description}</p>
                          )}
                          <div className="text-sm text-gray-500">
                            {career.relatedMajors && career.relatedMajors.length > 0 && career.relatedMajors[0] !== 'N/A' && (
                              <p>Related Majors: {career.relatedMajors.filter(m => m && m !== 'N/A').join(', ')}</p>
                            )}
                            {career.salary && career.salary.min && career.salary.max && (
                              <p>
                                Salary Range: ${career.salary.min.toLocaleString()} - ${career.salary.max.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Disclosure.Panel>
                </div>
              )}
            </Disclosure>
          </div>

          {/* Organizations Section */}
          <div className="mb-8">
            <Disclosure>
              {({ open }) => (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <Disclosure.Button className="w-full px-6 py-4 text-left bg-blue-600 text-white font-semibold flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <Image src="/icons/university.svg" alt="Organizations" width={20} height={20} className="filter invert brightness-200" />
                      Student Organizations
                    </span>
                    <ChevronUpIcon
                      className={`${
                        open ? 'transform rotate-180' : ''
                      } w-5 h-5 transition-transform duration-200`}
                    />
                  </Disclosure.Button>
                  <Disclosure.Panel className="px-6 py-4">
                    <div className="space-y-6">
                      {results.organizations.map((org, index) => (
                        <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {org.name}
                          </h3>
                          {org.description && org.description !== 'N/A' && (
                            <p className="text-gray-600 mb-2">{org.description}</p>
                          )}
                          <div className="text-sm text-gray-500">
                            {org.category && org.category !== 'N/A' && <p>Category: {org.category}</p>}
                            {org.website && org.website !== 'N/A' && (
                              <a
                                href={org.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Visit Website
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Disclosure.Panel>
                </div>
              )}
            </Disclosure>
          </div>

          {/* Events Section */}
          <div className="mb-8">
            <Disclosure>
              {({ open }) => (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <Disclosure.Button className="w-full px-6 py-4 text-left bg-blue-600 text-white font-semibold flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <Image src="/icons/calendar-1.svg" alt="Events" width={20} height={20} className="filter invert brightness-200" />
                      Upcoming Events
                    </span>
                    <ChevronUpIcon
                      className={`${
                        open ? 'transform rotate-180' : ''
                      } w-5 h-5 transition-transform duration-200`}
                    />
                  </Disclosure.Button>
                  <Disclosure.Panel className="px-6 py-4">
                    <div className="space-y-6">
                      {results.events.map((event, index) => (
                        <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {event.name}
                            {event.category && event.category !== 'N/A' && (
                              <span className="text-sm text-gray-500"> ({event.category})</span>
                            )}
                          </h3>
                          {event.description && event.description !== 'N/A' && (
                            <p className="text-gray-600 mb-2">{event.description}</p>
                          )}
                          <div className="text-sm text-gray-500">
                            {event.date && event.date !== 'N/A' && <p>Date: {event.date}</p>}
                            {event.location && event.location !== 'N/A' && <p>Location: {event.location}</p>}
                            {event.category && event.category !== 'N/A' && <p>Category: {event.category}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Disclosure.Panel>
                </div>
              )}
            </Disclosure>
          </div>

          {/* Download Results Button */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md transform hover:scale-105 active:scale-95"
            >
              <Image src="/icons/download.svg" alt="Download" width={20} height={20} className="filter invert brightness-200" />
              Download Results
            </button>
            <button
              onClick={handleStartOver}
              className="flex items-center gap-2 border border-blue-600 text-blue-600 bg-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-200 shadow-md transform hover:scale-105 active:scale-95"
            >
              <img src="/icons/list-restart.svg" alt="Start Over" width={20} height={20} className="inline-block align-middle" />
              Start Over
            </button>
          </div>
        </div>
      </div>
    </main>
  );
} 