'use client';

import { useState, useEffect } from 'react';
import { AssessmentResults } from '@/lib/types';
import { Disclosure } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/24/outline';
import { jsPDF } from 'jspdf';
import Image from 'next/image';
import AddToCalendarButton from '@/components/AddToCalendarButton';

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

  // Archetype title logic
  const archetypeTitle = results.archetype && results.archetype.trim() ? results.archetype : 'You Are: The Explorer 🧭';

  const handleDownloadPDF = () => {
    if (!results) return;
    const doc = new jsPDF();
    const topMargin = 20;
    const bottomMargin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = topMargin;
    const maxWidth = 170;
    const lineHeight = 6;
    const sectionSpacing = 8;
    const blue = [30, 64, 175]; // Blue for headers/titles
    const secondaryGray = [110, 115, 125]; // Slightly more pronounced gray for secondary text
    const black = [0, 0, 0];

    function ensurePageSpace(linesNeeded = 1) {
      if (y + linesNeeded * lineHeight > pageHeight - bottomMargin) {
        addFooter();
        doc.addPage();
        y = topMargin;
        // Reset font and color to body defaults after page break
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(black[0], black[1], black[2]);
      }
    }

    // --- Footer function ---
    function addFooter() {
      const footerY = pageHeight - 10;
      const text = 'Sidequest';
      const textFontSize = 10;
      const textWidth = doc.getTextWidth(text);
      const centerX = pageWidth / 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(textFontSize);
      doc.setTextColor(black[0], black[1], black[2]);
      // Center just the text (logo removed)
      doc.text(text, centerX - textWidth / 2, footerY + 2, { align: 'left' });
    }

    doc.setFontSize(18);
    doc.setTextColor(blue[0], blue[1], blue[2]);
    doc.setFont('helvetica', 'bold');
    // Remove all non-letter, non-number, non-punctuation, non-space characters (robust emoji/special char removal)
    const cleanTitle = archetypeTitle.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '').trim();
    doc.text(cleanTitle, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // --- Majors Section ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(blue[0], blue[1], blue[2]);
    ensurePageSpace();
    doc.text('Recommended Majors:', 15, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(black[0], black[1], black[2]);
    results.majors.forEach((major) => {
      ensurePageSpace();
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text(`• ${major.name} (${major.department})`, 18, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(major.description, maxWidth);
      ensurePageSpace(descLines.length);
      doc.text(descLines, 22, y);
      y += descLines.length * lineHeight;
      if (major.requirements && major.requirements.length > 0) {
        doc.setTextColor(secondaryGray[0], secondaryGray[1], secondaryGray[2]);
        const reqText = 'Requirements: ' + major.requirements.join(', ');
        const reqLines = doc.splitTextToSize(reqText, maxWidth);
        ensurePageSpace(reqLines.length);
        doc.text(reqLines, 22, y);
        doc.setTextColor(black[0], black[1], black[2]);
        y += reqLines.length * lineHeight;
      }
      y += 2;
    });
    y += sectionSpacing;

    // --- Careers Section ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(blue[0], blue[1], blue[2]);
    ensurePageSpace();
    doc.text('Career Paths:', 15, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(black[0], black[1], black[2]);
    results.careers.forEach((career) => {
      ensurePageSpace();
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text(`• ${career.title}`, 18, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(career.description, maxWidth);
      ensurePageSpace(descLines.length);
      doc.text(descLines, 22, y);
      y += descLines.length * lineHeight;
      // Career details in a single line when possible
      const details = [];
      if (career.salary && career.salary.min && career.salary.max) {
        details.push(`Salary: $${career.salary.min.toLocaleString()} - $${career.salary.max.toLocaleString()}`);
      }
      if (career.growthOutlook) {
        details.push(`Growth: ${career.growthOutlook}`);
      }
      if (career.educationLevel) {
        details.push(`Education: ${career.educationLevel}`);
      }
      if (details.length > 0) {
        doc.setTextColor(secondaryGray[0], secondaryGray[1], secondaryGray[2]);
        const detailsText = details.join(' | ');
        const detailsLines = doc.splitTextToSize(detailsText, maxWidth);
        ensurePageSpace(detailsLines.length);
        doc.text(detailsLines, 22, y);
        doc.setTextColor(black[0], black[1], black[2]);
        y += detailsLines.length * lineHeight;
      }
      if (career.relatedMajors && career.relatedMajors.length > 0) {
        doc.setTextColor(secondaryGray[0], secondaryGray[1], secondaryGray[2]);
        const relMajors = 'Related Majors: ' + career.relatedMajors.join(', ');
        const relMajorsLines = doc.splitTextToSize(relMajors, maxWidth);
        ensurePageSpace(relMajorsLines.length);
        doc.text(relMajorsLines, 22, y);
        doc.setTextColor(black[0], black[1], black[2]);
        y += relMajorsLines.length * lineHeight;
      }
      y += 2;
    });
    y += sectionSpacing;

    // --- Organizations Section ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(blue[0], blue[1], blue[2]);
    ensurePageSpace();
    doc.text('Student Organizations:', 15, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(black[0], black[1], black[2]);
    results.organizations.forEach((org) => {
      ensurePageSpace();
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text(`• ${org.name} (${org.category})`, 18, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(org.description, maxWidth);
      ensurePageSpace(descLines.length);
      doc.text(descLines, 22, y);
      y += descLines.length * lineHeight;
      if (org.website) {
        doc.setTextColor(secondaryGray[0], secondaryGray[1], secondaryGray[2]);
        const webLines = doc.splitTextToSize('Website: ' + org.website, maxWidth);
        ensurePageSpace(webLines.length);
        doc.text(webLines, 22, y);
        doc.setTextColor(black[0], black[1], black[2]);
        y += webLines.length * lineHeight;
      }
      y += 2;
    });
    y += sectionSpacing;

    // --- Events Section ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(blue[0], blue[1], blue[2]);
    ensurePageSpace();
    doc.text('Upcoming Events:', 15, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(black[0], black[1], black[2]);
    results.events.forEach((event) => {
      ensurePageSpace();
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text(`• ${event.name} (${event.category})`, 18, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(event.description, maxWidth);
      ensurePageSpace(descLines.length);
      doc.text(descLines, 22, y);
      y += descLines.length * lineHeight;
      doc.setTextColor(secondaryGray[0], secondaryGray[1], secondaryGray[2]);
      const dateLoc = `Date: ${event.date} | Location: ${event.location}`;
      const dateLocLines = doc.splitTextToSize(dateLoc, maxWidth);
      ensurePageSpace(dateLocLines.length);
      doc.text(dateLocLines, 22, y);
      doc.setTextColor(black[0], black[1], black[2]);
      y += dateLocLines.length * lineHeight;
      y += 2;
    });

    // Add footer to last page
    addFooter();
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
          <h1 className="text-4xl font-bold text-blue-800 mb-8 text-center">
            {archetypeTitle}
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
                          <div className="text-sm text-gray-500 space-y-1">
                            <div className="flex flex-wrap gap-4">
                              {career.salary && career.salary.min && career.salary.max && (
                                <span>Salary: ${career.salary.min.toLocaleString()} - ${career.salary.max.toLocaleString()}</span>
                              )}
                              {career.growthOutlook && (
                                <span>Growth: {career.growthOutlook}</span>
                              )}
                              {career.educationLevel && (
                                <span>Education: {career.educationLevel}</span>
                              )}
                            </div>
                            {career.relatedMajors && career.relatedMajors.length > 0 && career.relatedMajors[0] !== 'N/A' && (
                              <p>Related Majors: {career.relatedMajors.filter(m => m && m !== 'N/A').join(', ')}</p>
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
                      <Image src="/icons/calendar-days.svg" alt="Events" width={20} height={20} className="filter invert brightness-200" />
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
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">
                              {event.name}
                              {event.category && event.category !== 'N/A' && (
                                <span className="text-sm text-gray-500"> ({event.category})</span>
                              )}
                            </h3>
                            {event.date && event.date !== 'N/A' && (
                              <AddToCalendarButton 
                                type="event" 
                                item={event} 
                                className="ml-4 flex-shrink-0"
                              />
                            )}
                          </div>
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
              <Image src="/icons/list-restart.svg" alt="Start Over" width={20} height={20} className="inline-block align-middle" />
              Start Over
            </button>
          </div>
        </div>
      </div>
    </main>
  );
} 