'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Event } from '@/lib/types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import { CalendarIcon } from 'lucide-react';

type CalendarView = 'today' | '3-day' | '7-day' | 'month';

interface CalendarProps {
  events?: Event[];
}


export default function Calendar({ events = [] }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get events for the current view period
  const filteredEvents = useMemo(() => {
    const startOfPeriod = getStartOfPeriod(currentDate, view);
    const endOfPeriod = getEndOfPeriod(currentDate, view);
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startOfPeriod && eventDate <= endOfPeriod;
    });
  }, [events, currentDate, view]);

        const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (view) {
      case 'today':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case '3-day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 3 : -3));
        break;
      case '7-day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const formatHeaderDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'long', 
      year: 'numeric' 
    };
    
    if (view === 'today') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric' 
      });
    }
    
    if (view === '3-day' || view === '7-day') {
      const startOfPeriod = getStartOfPeriod(currentDate, view);
      const endOfPeriod = getEndOfPeriod(currentDate, view);
      
      if (startOfPeriod.getMonth() === endOfPeriod.getMonth()) {
        return `${startOfPeriod.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      } else {
        return `${startOfPeriod.toLocaleDateString('en-US', { month: 'short' })} - ${endOfPeriod.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
      }
    }
    
    return currentDate.toLocaleDateString('en-US', options);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">{formatHeaderDate()}</h2>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate('prev')}
              className="h-8 w-8"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate('next')}
              className="h-8 w-8"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="ml-2 text-xs"
            >
              Today
            </Button>
          </div>
        </div>

        {/* View Toggle and Add Event */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 p-1">
            {(['today', '3-day', '7-day', 'month'] as CalendarView[]).map((viewType) => (
              <Button
                key={viewType}
                variant={view === viewType ? "default" : "ghost"}
                size="sm"
                onClick={() => setView(viewType)}
                className="text-xs h-7 px-3"
              >
                {viewType === 'today' ? 'Today' : viewType === '3-day' ? '3D' : viewType === '7-day' ? '7D' : 'Month'}
              </Button>
            ))}
          </div>
          
          <Button
            size="sm"
            onClick={() => {
              // For now, we'll just show an alert. In a real implementation,
              // this would open a modal to add events
              alert('Add event functionality will be implemented with assessment integration');
            }}
            className="flex items-center gap-1"
          >
            <PlusIcon className="w-4 h-4" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {view === 'month' ? (
          <MonthView 
            currentDate={currentDate} 
            events={filteredEvents}
            selectedDate={selectedDate}
            onDateClick={setSelectedDate}
          />
        ) : view === 'today' ? (
          <TodayView 
            currentDate={currentDate} 
            events={filteredEvents}
            selectedDate={selectedDate}
            onDateClick={setSelectedDate}
          />
        ) : (
          <DayView 
            currentDate={currentDate} 
            events={filteredEvents}
            viewType={view}
            selectedDate={selectedDate}
            onDateClick={setSelectedDate}
          />
        )}
      </div>

      {/* Events List for Selected Date */}
      {selectedDate && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">
            Events for {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          {filteredEvents.filter(event => 
            new Date(event.date).toDateString() === selectedDate.toDateString()
          ).length > 0 ? (
            <div className="space-y-2">
              {filteredEvents
                .filter(event => new Date(event.date).toDateString() === selectedDate.toDateString())
                .map((event, index) => (
                <div key={index} className="p-2 bg-white rounded border">
                  <div className="font-medium text-sm">{event.name}</div>
                  <div className="text-xs text-gray-500">{event.description}</div>
                  {event.location && (
                    <div className="text-xs text-gray-500">📍 {event.location}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No events scheduled for this date.</p>
          )}
        </div>
      )}
    </div>
  );
}

// Month View Component
function MonthView({ 
  currentDate, 
  events, 
  selectedDate, 
  onDateClick 
}: {
  currentDate: Date;
  events: Event[];
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
}) {
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startOfCalendar = new Date(startOfMonth);
  startOfCalendar.setDate(startOfCalendar.getDate() - startOfMonth.getDay());
  
  const weeks: Date[][] = [];
  const currentWeek: Date[] = [];
  
  for (let i = 0; i < 42; i++) {
    const date = new Date(startOfCalendar);
    date.setDate(date.getDate() + i);
    
    currentWeek.push(date);
    
    if (currentWeek.length === 7) {
      weeks.push([...currentWeek]);
      currentWeek.length = 0;
    }
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      {/* Day Headers */}
      <div className="grid grid-cols-7 bg-gray-50">
        {dayNames.map(day => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 border-r border-gray-200 last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-rows-6">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((date, dayIndex) => {
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              const dayEvents = events.filter(event => 
                new Date(event.date).toDateString() === date.toDateString()
              );
              
              return (
                <button
                  key={dayIndex}
                  onClick={() => onDateClick(date)}
                  className={`
                    relative h-24 p-1 text-left border-r border-b border-gray-200 last:border-r-0
                    hover:bg-blue-50 transition-colors duration-150
                    ${!isCurrentMonth ? 'text-gray-400 bg-gray-50' : 'text-gray-900'}
                    ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
                    ${isToday ? 'bg-blue-600 text-white' : ''}
                  `}
                >
                  <span className={`text-sm font-medium ${isToday ? 'text-white' : ''}`}>
                    {date.getDate()}
                  </span>
                  
                  {/* Event Indicators */}
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 2).map((event, index) => (
                      <div
                        key={index}
                        className="text-xs px-1 py-0.5 bg-blue-100 text-blue-800 rounded truncate"
                        title={event.name}
                      >
                        {event.name}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Today View Component (Vertical layout for just today)
function TodayView({ 
  currentDate, 
  events, 
  selectedDate, 
  onDateClick 
}: {
  currentDate: Date;
  events: Event[];
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
}) {
  const today = new Date(currentDate);
  const isSelected = selectedDate?.toDateString() === today.toDateString();
  const isToday = today.toDateString() === new Date().toDateString();
  
  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.toDateString() === today.toDateString();
  });

  return (
    <div>
      {/* Day Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <button
          onClick={() => onDateClick(today)}
          className={`
            w-full p-4 text-center
            hover:bg-blue-50 transition-colors duration-150
            ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
            ${isToday ? 'bg-blue-600 text-white' : 'text-gray-900'}
          `}
        >
          <div className="text-sm font-medium">
            {today.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div className={`text-lg font-bold ${isToday ? 'text-white' : 'text-gray-900'}`}>
            {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </div>
        </button>
      </div>
      
      {/* Time Slots - Vertical Layout */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="flex h-16">
            <div className="w-16 p-2 text-xs text-gray-500 border-r border-gray-200 flex items-center justify-end">
              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
            </div>
            <div className="flex-1 p-2 relative">
              {/* Events for this time slot */}
              {todayEvents.map((event, eventIndex) => (
                <div
                  key={eventIndex}
                  className="text-xs p-1 bg-blue-100 text-blue-800 rounded mb-1 truncate"
                  title={`${event.name} - ${event.description}`}
                >
                  {event.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Day/Week View Component (Horizontal layout for 3-day and 7-day)
function DayView({ 
  currentDate, 
  events, 
  viewType, 
  selectedDate, 
  onDateClick 
}: {
  currentDate: Date;
  events: Event[];
  viewType: '3-day' | '7-day';
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
}) {
  const startOfPeriod = getStartOfPeriod(currentDate, viewType);
  const days: Date[] = [];
  
  for (let i = 0; i < (viewType === '3-day' ? 3 : 7); i++) {
    const date = new Date(startOfPeriod);
    date.setDate(date.getDate() + i);
    days.push(date);
  }

  return (
    <div>
      {/* Day Headers */}
      <div className={`grid grid-cols-${viewType === '3-day' ? '3' : '7'} bg-gray-50`}>
        {days.map((date, index) => {
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          
          return (
            <button
              key={index}
              onClick={() => onDateClick(date)}
              className={`
                p-4 text-center border-r border-gray-200 last:border-r-0
                hover:bg-blue-50 transition-colors duration-150
                ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
                ${isToday ? 'bg-blue-600 text-white' : 'text-gray-900'}
              `}
            >
              <div className="text-sm font-medium">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={`text-lg font-bold ${isToday ? 'text-white' : 'text-gray-900'}`}>
                {date.getDate()}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Time Slots */}
      <div className="grid grid-cols-1 divide-y divide-gray-200">
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className={`grid grid-cols-${viewType === '3-day' ? '3' : '7'} h-16`}>
            {days.map((date, dayIndex) => {
              const dayEvents = events.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate.toDateString() === date.toDateString();
              });
              
              return (
                <div
                  key={dayIndex}
                  className="border-r border-gray-200 last:border-r-0 p-2 relative"
                >
                  {dayIndex === 0 && (
                    <div className="absolute left-0 top-0 text-xs text-gray-500 -ml-12 w-10 text-right">
                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                    </div>
                  )}
                  
                  {/* Events for this time slot */}
                  {dayEvents.map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className="text-xs p-1 bg-blue-100 text-blue-800 rounded mb-1 truncate"
                      title={`${event.name} - ${event.description}`}
                    >
                      {event.name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper functions
function getStartOfPeriod(date: Date, view: CalendarView): Date {
  const start = new Date(date);
  
  switch (view) {
    case 'today':
      return start;
    case '3-day':
      return start;
    case '7-day':
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      return start;
    case 'month':
      start.setDate(1);
      return start;
    default:
      return start;
  }
}

function getEndOfPeriod(date: Date, view: CalendarView): Date {
  const end = new Date(date);
  
  switch (view) {
    case 'today':
      return end;
    case '3-day':
      end.setDate(end.getDate() + 2);
      return end;
    case '7-day':
      const day = end.getDay();
      end.setDate(end.getDate() + (6 - day));
      return end;
    case 'month':
      end.setMonth(end.getMonth() + 1, 0);
      return end;
    default:
      return end;
  }
} 