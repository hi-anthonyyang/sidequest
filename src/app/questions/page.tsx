'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Question, AssessmentResponse, UniversityId } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
// @ts-ignore: no types for canvas-confetti
import confetti from 'canvas-confetti';

const questions: Question[] = [
  {
    id: 1,
    text: "What subjects or topics do you find most interesting?",
    placeholder: "e.g., I enjoy learning about how businesses work and love reading stories from different cultures. I'm also curious about how we can protect our environment."
  },
  {
    id: 2,
    text: "What are your favorite activities outside of school?",
    placeholder: "e.g., I play in a band, help out at the local food bank, and enjoy swimming. I also like taking photos and trying new recipes."
  },
  {
    id: 3,
    text: "What kind of problems do you enjoy solving?",
    placeholder: "e.g., I like helping organize community events and fixing things around the house. I also enjoy working on tricky math problems that make me think."
  },
  {
    id: 4,
    text: "What are your career goals or aspirations?",
    placeholder: "e.g., I want to help build better communities as an engineer. I'm also interested in starting a program to help kids learn new skills."
  },
  {
    id: 5,
    text: "What skills do you want to develop in college?",
    placeholder: "e.g., I want to get better at speaking in front of groups and learn how to work with data. I'd also like to improve my Spanish and learn more about design."
  },
  {
    id: 6,
    text: "What kind of work environment do you thrive in?",
    placeholder: "e.g., I like places where I can work with others but also have time to focus on my own tasks. I enjoy being creative and learning new things."
  },
  {
    id: 7,
    text: "What impact do you want to make in your future career?",
    placeholder: "e.g., I want to help make healthcare more accessible in small towns. I also hope to create opportunities for people who might not have them otherwise."
  }
];

const universities: { id: UniversityId; name: string }[] = [
  { id: 'fresno_state', name: 'Fresno State' },
  { id: 'uc_berkeley', name: 'UC Berkeley' },
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
          <div className="flex space-x-4 mb-8">
            <Image src="/icons/shield.svg" alt="Shield" width={32} height={32} className="w-8 h-8" />
            <Image src="/icons/sword.svg" alt="Sword" width={32} height={32} className="w-8 h-8" />
            <Image src="/icons/wand-sparkles.svg" alt="Wand" width={32} height={32} className="w-8 h-8" />
          </div>
          <p className="text-xl font-semibold text-blue-700">Building out your quests…</p>
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