'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarIcon, MapIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CalendarTab from '@/components/CalendarTab';
import QuestsTab from '@/components/QuestsTab';

export default function Home() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('calendar');

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'quests') {
      setActiveTab('quests');
    } else {
      setActiveTab('calendar');
    }
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-center mb-8">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="quests" className="flex items-center gap-2">
                <MapIcon className="w-4 h-4" />
                Quests
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="calendar" className="mt-0">
            <CalendarTab />
          </TabsContent>
          
          <TabsContent value="quests" className="mt-0">
            <QuestsTab />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
