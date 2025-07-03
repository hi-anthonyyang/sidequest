'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarIcon, CheckIcon } from 'lucide-react';
import { addEvent, createEventFromAssessmentResult, eventExists } from '@/lib/calendar';
import { Major, CareerPath, Organization, Event } from '@/lib/types';

interface AddToCalendarButtonProps {
  type: 'major' | 'career' | 'organization' | 'event';
  item: Major | CareerPath | Organization | Event;
  university?: string;
  className?: string;
}

export default function AddToCalendarButton({ 
  type, 
  item, 
  university, 
  className = "" 
}: AddToCalendarButtonProps) {
  const [isAdded, setIsAdded] = useState(false);

  // Check if the event already exists when component mounts
  useEffect(() => {
    const event = createEventFromAssessmentResult(type, item, university);
    const exists = eventExists(event.name, event.date);
    setIsAdded(exists);
  }, [type, item, university]);

  const handleAddToCalendar = () => {
    if (isAdded) return; // Prevent duplicate additions
    
    const event = createEventFromAssessmentResult(type, item, university);
    addEvent(event);
    setIsAdded(true);
  };

  return (
    <Button
      variant={isAdded ? "default" : "outline"}
      size="sm"
      onClick={handleAddToCalendar}
      disabled={isAdded}
      className={`flex items-center gap-2 transition-all duration-200 ${className}`}
    >
      {isAdded ? (
        <>
          <CheckIcon className="w-4 h-4" />
          Added to Calendar
        </>
      ) : (
        <>
          <CalendarIcon className="w-4 h-4" />
          Add to Calendar
        </>
      )}
    </Button>
  );
} 