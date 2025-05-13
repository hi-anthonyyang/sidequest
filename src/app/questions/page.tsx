'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Question, AssessmentResponse, UniversityId } from '@/lib/types';
import Image from 'next/image';
// @ts-expect-error: no types for canvas-confetti
import confetti from 'canvas-confetti';

const questions: Question[] = [
  {
    id: 1,
    text: "What do you usually Google or look up when you're just curious about something?",
    placeholder: "This helps us see what really grabs your attention — even outside of school."
  },
  {
    id: 2,
    text: "Think about a school project or activity you really got into. What was it, and why did you like it?",
    placeholder: "We're looking for something that made you feel focused, excited, or proud — even if it was challenging."
  },
  {
    id: 3,
    text: "If your future job helped other people, who would you want to help?",
    placeholder: "It could be kids, families, your community, animals, the planet — anyone. No wrong answers."
  },
  {
    id: 4,
    text: "Which one sounds most like you: build something, lead something, fix something, or help someone?",
    placeholder: "Go with what feels right — you can choose more than one if it fits. You can write something else that wasn't mentioned."
  },
  {
    id: 5,
    text: "What do people usually ask you for help with?",
    placeholder: "Think about your friends, siblings, classmates — big or small things count."
  },
  {
    id: 6,
    text: "What's something you'd actually want to get better at — even if it takes a while?",
    placeholder: "This shows us where you want to grow — and what you're curious to learn."
  }
];

const universities: { id: UniversityId; name: string }[] = [
  { id: 'fresno_state', name: 'Fresno State' },
  { id: 'reedley_college', name: 'Reedley College' }
];

export default function QuestionsPage() {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AssessmentResponse[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityId>('fresno_state');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          answers,
          universityId: selectedUniversity
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit assessment');
      }

      // Show success and confetti before navigating
      setShowSuccess(true);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(async () => {
        const results = await response.json();
        localStorage.setItem('assessmentResults', JSON.stringify(results));
        router.push('/results');
      }, 1200);
    } catch (error) {
      setLoading(false);
      console.error('Error submitting assessment:', error);
      // Handle error appropriately
    }
  };

  const handleNext = () => {
    if (currentAnswer.trim()) {
      const newAnswers = [...answers, {
        questionId: questions[currentQuestionIndex].id,
        answer: currentAnswer.trim()
      }];
      setAnswers(newAnswers);
      setCurrentAnswer('');

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white relative">
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white bg-opacity-90">
          <p className="text-3xl font-bold text-green-600 mb-4">Success!</p>
          <p className="text-lg text-gray-700">Your answers have been submitted.</p>
        </div>
      )}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white bg-opacity-90">
          <Image src="/icons/campfire.gif" alt="Campfire" width={80} height={80} className="mb-8" />
          <p className="text-xl font-semibold text-blue-700 flex items-center justify-center">
            Building out your quests
            <span className="ml-1 animate-ellipsis">…</span>
          </p>
          <style jsx>{`
            @keyframes ellipsis {
              0% { content: ''; opacity: 1; }
              25% { content: '.'; opacity: 1; }
              50% { content: '..'; opacity: 1; }
              75% { content: '...'; opacity: 1; }
              100% { content: ''; opacity: 1; }
            }
            .animate-ellipsis::after {
              display: inline-block;
              content: '';
              animation: ellipsis 1.2s steps(4, end) infinite;
              width: 1.5em;
              text-align: left;
            }
          `}</style>
        </div>
      )}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* University Selection */}
          <div className="mb-8">
            <label htmlFor="university" className="block text-sm font-medium text-gray-700 mb-2">
              Select University
            </label>
            <select
              id="university"
              value={selectedUniversity}
              onChange={(e) => setSelectedUniversity(e.target.value as UniversityId)}
              className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#333333]"
            >
              {universities.map((university) => (
                <option key={university.id} value={university.id}>
                  {university.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-8">
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              {currentQuestion.text}
            </h2>
            
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder={currentQuestion.placeholder}
              className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-gray-400 text-[#333333]"
            />

            <button
              onClick={handleNext}
              disabled={!currentAnswer.trim()}
              className="mt-6 w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// Add this to your globals.css or tailwind config:
// .animate-spin-slow { animation: spin 2s linear infinite; }
// .animate-scroll-x { animation: scroll-x 3s linear infinite; }
// @keyframes spin { 100% { transform: rotate(360deg); } }
// @keyframes scroll-x { 0% { transform: translateX(0); } 100% { transform: translateX(-40px); } }

// Add this to your globals.css:
// .animate-spin-y-slow { animation: spinY 2.5s linear infinite; }
// .animate-spin-y-slower { animation: spinY 2.8s linear infinite; }
// .animate-spin-y-slowest { animation: spinY 3s linear infinite; }
// @keyframes spinY { 100% { transform: rotateY(360deg); } } 