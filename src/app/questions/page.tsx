'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Question, AssessmentResponse, UniversityId } from '@/lib/types';
import Image from 'next/image';
// @ts-expect-error: no types for canvas-confetti
import confetti from 'canvas-confetti';

const questions: Question[] = [
  {
    id: 1,
    text: "What school subjects or topics do you naturally enjoy or do well in?",
    placeholder: "For example: history, science, math, art, PE — or anything that feels easy or interesting."
  },
  {
    id: 2,
    text: "When you're working on something, do you like working alone, with a partner, in a small group, or leading a team?",
    placeholder: "You can also say things like: 'I like clear steps,' 'I like to be in charge,' or 'I just do my own thing.'"
  },
  {
    id: 3,
    text: "If you could help solve a problem, what would it be?",
    placeholder: "For example: helping animals, improving mental health, fixing pollution, or making school better."
  },
  {
    id: 4,
    text: "Which one sounds most like you: I like to build things, I like to fix things, I like to help people, or I like to lead?",
    placeholder: "You can say more than one — or write your own, like 'design' or 'create.'"
  },
  {
    id: 5,
    text: "What kinds of things do you like to figure out or understand better?",
    placeholder: "For example: how people think, how stuff works, how games are made, why things are unfair, or how to make money."
  },
  {
    id: 6,
    text: "What do people usually ask you to help with?",
    placeholder: "For example: tech stuff, advice, explaining things, fixing something, calming people down."
  }
];

function QuestionsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const universityId = searchParams?.get('university') as UniversityId | null;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AssessmentResponse[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const ETA_MS = 20000; // target perceived wait (ms)
  const [etaRemaining, setEtaRemaining] = useState(ETA_MS);
  const [showSuccess, setShowSuccess] = useState(false);

  // On mount, redirect to home (which forwards to /quests) if universityId is missing
  useEffect(() => {
    if (!universityId) {
      router.replace('/');
    }
  }, [router, universityId]);

  const handleSubmit = async () => {
    setLoading(true);
    setEtaRemaining(ETA_MS);
    const ticker = window.setInterval(() => {
      setEtaRemaining((prev) => Math.max(0, prev - 100));
    }, 100);
    try {
      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          answers,
          universityId: universityId
        }),
      });

      if (!response.ok) {
        let detail = '';
        try {
          const err = await response.json();
          detail = err?.message || err?.error || '';
        } catch {}
        throw new Error(detail ? `Failed to submit assessment: ${detail}` : 'Failed to submit assessment');
      }

      // Show success and confetti before navigating
      setShowSuccess(true);
      window.clearInterval(ticker);
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
      setEtaRemaining(0);
      window.clearInterval(ticker);
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
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white bg-opacity-90 px-4">
          <Image src="/icons/campfire.gif" alt="Campfire" width={80} height={80} className="mb-6" />
          <p className="text-lg md:text-xl font-semibold text-blue-700 flex items-center justify-center mb-3">
            Preparing your results
            <span className="ml-1 animate-ellipsis">…</span>
          </p>
          <div className="w-full max-w-sm">
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-[width] duration-100 ease-linear"
                style={{ width: `${Math.min(100, (1 - etaRemaining / ETA_MS) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 text-center">~{Math.max(0, Math.ceil(etaRemaining / 1000))}s remaining</p>
          </div>
          <style jsx>{`
            @keyframes ellipsis { 0% { content: ''; opacity: 1; } 25% { content: '.'; opacity: 1; } 50% { content: '..'; opacity: 1; } 75% { content: '...'; opacity: 1; } 100% { content: ''; opacity: 1; } }
            .animate-ellipsis::after { display: inline-block; content: ''; animation: ellipsis 1.2s steps(4, end) infinite; width: 1.5em; text-align: left; }
          `}</style>
        </div>
      )}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
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

export default function QuestionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QuestionsPageClient />
    </Suspense>
  );
}

// (animation helper comments removed; kept CSS for the inline ellipsis animation above)