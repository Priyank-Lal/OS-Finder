import React, { useState } from 'react';
import { Star, ChevronDown, ChevronUp, Trophy, Code } from 'lucide-react';

interface RepoCardProps {
  repo: {
    id: string;
    name: string;
    description: string;
    language: string;
    score: number;
    stars: number;
    summary?: string;
    categories?: string[];
    topics?: string[];
    recommendedLevel?: string;
  };
}

export default function RepoCard({ repo }: RepoCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-xl overflow-hidden mb-3 shadow-lg hover:shadow-indigo-500/20 hover:border-indigo-500/50 transition-all duration-300 group">
      {/* Header */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-white text-lg truncate pr-2 group-hover:text-indigo-300 transition-colors" title={repo.name}>
            {repo.name}
          </h3>
          <span className="px-2 py-1 rounded-full bg-gradient-to-r from-gray-800 to-gray-900 text-xs font-medium text-gray-300 border border-gray-700 flex items-center gap-1 shrink-0">
            <Code className="w-3 h-3" />
            {repo.language || 'Unknown'}
          </span>
        </div>

        <p className="text-gray-400 text-sm mb-3 line-clamp-2 leading-relaxed" title={repo.description}>
          {repo.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm mb-2">
          <div className="flex items-center gap-1.5 text-yellow-400">
            <Star className="w-4 h-4 fill-current" />
            <span className="font-semibold">{repo.stars?.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Trophy className="w-4 h-4" />
            <span className="font-semibold">{repo.score || 0}/100</span>
          </div>
          {repo.recommendedLevel && (
            <span className="px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 text-xs border border-green-700">
              {repo.recommendedLevel}
            </span>
          )}
        </div>

        {/* Tags */}
        {((repo.categories && repo.categories.length > 0) || (repo.topics && repo.topics.length > 0)) && (
          <div className="flex flex-wrap gap-1.5">
            {repo.categories?.slice(0, 3).map((cat, i) => (
              <span key={`cat-${i}`} className="px-2 py-0.5 rounded bg-indigo-900/30 text-indigo-300 text-xs border border-indigo-700">
                {cat}
              </span>
            ))}
            {repo.topics?.slice(0, 3).map((topic, i) => (
              <span key={`topic-${i}`} className="px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 text-xs border border-purple-700">
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Accordion for Summary/Details */}
      {repo.summary && (
        <div className="border-t border-gray-800">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs font-medium text-gray-500 hover:text-indigo-300 hover:bg-gray-800/50 transition-colors"
          >
            <span>{expanded ? 'Hide Details' : 'View Details'}</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {expanded && (
            <div className="px-4 pb-4 pt-2 text-sm text-gray-300 bg-gradient-to-b from-gray-800/30 to-transparent animate-in slide-in-from-top-2 duration-200">
              <p className="leading-relaxed whitespace-pre-wrap">{repo.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
