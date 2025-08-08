'use client';
import { useState, useEffect } from 'react';
import Calendar from '@/components/Calendar';
import { Event } from '@/lib/types';
import { getStoredEvents } from '@/lib/calendar';

export default function CalendarTab() {
  // Feature flag: keep Calendar disabled unless explicitly enabled
  const calendarEnabled = process.env.NEXT_PUBLIC_FEATURE_CALENDAR_ENABLED === 'true';
  const [events, setEvents] = useState<Event[]>([]);

  // Load events from localStorage on component mount
  useEffect(() => {
    const storedEvents = getStoredEvents();
    // Add some default demo events if no events exist
    if (storedEvents.length === 0) {
      const demoEvents: Event[] = [
        {
          id: '1',
          name: "Computer Science Career Fair",
          description: "Meet with tech companies and explore internship opportunities",
          date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
          location: "Student Union Building",
          category: "Career"
        },
        {
          id: '2',
          name: "Engineering Club Meeting",
          description: "Weekly meeting to discuss upcoming projects and events",
          date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
          location: "Engineering Building Room 101",
          category: "Club"
        },
        {
          id: '3',
          name: "Math Tutoring Session",
          description: "Free tutoring for calculus and algebra",
          date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
          location: "Library Study Room 205",
          category: "Academic"
        }
      ];
      setEvents(demoEvents);
    } else {
      setEvents(storedEvents);
    }
  }, []);

  if (!calendarEnabled) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Calendar</h1>
          <p className="text-gray-600">
            Keep track of your academic schedule, events, and important dates.
          </p>
        </div>
        
        <Calendar 
          events={events}
        />
        
        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">📚 Academic Events</h3>
            <p className="text-sm text-blue-700">
              Track classes, exams, assignment due dates, and study sessions.
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">🎯 Career Events</h3>
            <p className="text-sm text-green-700">
              Job fairs, networking events, and internship deadlines.
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-900 mb-2">🏆 Extracurricular</h3>
            <p className="text-sm text-purple-700">
              Club meetings, sports events, and social activities.
            </p>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 mt-0.5">💡</div>
            <div>
              <h4 className="font-medium text-yellow-900">Coming Soon: Assessment Integration</h4>
              <p className="text-sm text-yellow-700 mt-1">
                After completing your Sidequest assessment, you&apos;ll be able to add recommended events, 
                career fairs, and important dates directly to your calendar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 