'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarIcon, CheckIcon } from 'lucide-react';
import { addEvent, createEventFromAssessmentResult } from '@/lib/calendar';
import { Major, CareerPath, Organization } from '@/lib/types';

interface AddToCalendarButtonProps {
  type: 'major' | 'career' | 'organization';
  item: Major | CareerPath | Organization;
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

  const handleAddToCalendar = () => {
    const event = createEventFromAssessmentResult(type, item, university);
    addEvent(event);
    setIsAdded(true);
    
    // Reset the "added" state after 3 seconds
    setTimeout(() => {
      setIsAdded(false);
    }, 3000);
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