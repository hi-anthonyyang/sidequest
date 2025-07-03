import { Event } from '@/lib/types';

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
  item: any,
  university?: string
): Event {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 7); // Default to one week from now
  
  switch (type) {
    case 'career':
      return {
        name: `${item.title} Career Exploration`,
        description: `Research and explore opportunities in ${item.title}. ${item.description}`,
        date: baseDate.toISOString(),
        location: 'Online Research',
        category: 'Career'
      };
    
    case 'organization':
      return {
        name: `${item.name} Meeting`,
        description: `Attend ${item.name} meeting or event. ${item.description}`,
        date: baseDate.toISOString(),
        location: item.location || `${university} Campus`,
        category: 'Extracurricular'
      };
    
    case 'major':
      return {
        name: `${item.name} Information Session`,
        description: `Learn more about ${item.name} major in ${item.department}. ${item.description}`,
        date: baseDate.toISOString(),
        location: `${item.department} Department`,
        category: 'Academic'
      };
    
    case 'event':
      return {
        name: item.name,
        description: item.description || 'Event from assessment recommendations',
        date: item.date, // Use the actual event date
        location: item.location || 'TBD',
        category: item.category || 'Event'
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