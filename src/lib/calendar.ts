import { Event, Major, CareerPath, Organization } from '@/lib/types';

// Key for localStorage
const CALENDAR_EVENTS_KEY = 'sidequest_calendar_events';

// Get events from localStorage
export function getStoredEvents(): Event[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(CALENDAR_EVENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading calendar events:', error);
    return [];
  }
}

// Save events to localStorage
export function saveEvents(events: Event[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(events));
  } catch (error) {
    console.error('Error saving calendar events:', error);
  }
}

// Check if an event already exists in the calendar
export function eventExists(eventName: string, eventDate: string): boolean {
  const events = getStoredEvents();
  return events.some(event => 
    event.name === eventName && 
    event.date.split('T')[0] === eventDate.split('T')[0] // Compare dates only, not time
  );
}

// Add a new event
export function addEvent(event: Event): void {
  const events = getStoredEvents();
  const eventWithId = { ...event, id: Date.now().toString() };
  events.push(eventWithId);
  saveEvents(events);
}

// Remove an event
export function removeEvent(eventId: string): void {
  const events = getStoredEvents().filter(event => event.id !== eventId);
  saveEvents(events);
}

// Convert assessment result items to calendar events
export function createEventFromAssessmentResult(
  type: 'career' | 'organization' | 'major' | 'event',
  item: Major | CareerPath | Organization | Event,
  university?: string
): Event {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 7); // Default to one week from now
  
  switch (type) {
    case 'career':
      const career = item as CareerPath;
      return {
        name: `${career.title} Career Exploration`,
        description: `Research and explore opportunities in ${career.title}. ${career.description}`,
        date: baseDate.toISOString(),
        location: 'Online Research',
        category: 'Career'
      };
    
    case 'organization':
      const org = item as Organization;
      return {
        name: `${org.name} Meeting`,
        description: `Attend ${org.name} meeting or event. ${org.description}`,
        date: baseDate.toISOString(),
        location: `${university} Campus`,
        category: 'Extracurricular'
      };
    
    case 'major':
      const major = item as Major;
      return {
        name: `${major.name} Information Session`,
        description: `Learn more about ${major.name} major in ${major.department}. ${major.description}`,
        date: baseDate.toISOString(),
        location: `${major.department} Department`,
        category: 'Academic'
      };
    
    case 'event':
      const event = item as Event;
      return {
        name: event.name,
        description: event.description || 'Event from assessment recommendations',
        date: event.date, // Use the actual event date
        location: event.location || 'TBD',
        category: event.category || 'Event'
      };
    
    default:
      return {
        name: 'Assessment Follow-up',
        description: 'Follow up on Sidequest assessment recommendations',
        date: baseDate.toISOString(),
        location: 'TBD',
        category: 'Academic'
      };
  }
} 