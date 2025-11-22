import React, { useState } from 'react';
import { Star, GitFork, Activity, AlertCircle, Code2, Users, TrendingUp, CheckCircle, Clock, Package } from 'lucide-react';

interface RepoDetailProps {
  repo: {
    id: string;
    name: string;
    description: string;
    language: string;
    stars: number;
    score: number;
    overview?: string;
    activity?: {
      commits?: string;
      contributors?: string;
      lastUpdate?: string;
    };
    health?: {
      issues?: string;
      pullRequests?: string;
      maintenance?: string;
    };
    technical?: {
      dependencies?: string;
      size?: string;
      topics?: string[];
    };
    contribution?: {
      difficulty?: string;
      opportunities?: string;
      guidelines?: string;
    };
  };
}

export default function RepoDetailCard({ repo }: RepoDetailProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const Section = ({ title, icon: Icon, content, sectionKey }: any) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <div className="border-b border-gray-800 last:border-0">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-indigo-400" />
            <span className="font-medium text-white text-sm">{title}</span>
          </div>
          <div className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </div>
        </button>
        {isExpanded && (
          <div className="px-4 pb-4 text-sm text-gray-300 animate-in slide-in-from-top-2 duration-200">
            {content}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 p-5 border-b border-gray-700">
        <div className="flex justify-between items-start mb-3">
          <h2 className="font-bold text-white text-xl">{repo.name}</h2>
          <span className="px-3 py-1 rounded-full bg-gray-800 text-xs font-medium text-gray-300 border border-gray-700 flex items-center gap-1.5">
            <Code2 className="w-3 h-3" />
            {repo.language || 'Unknown'}
          </span>
        </div>
        
        <p className="text-gray-300 text-sm mb-4">{repo.description}</p>
        
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-yellow-400">
            <Star className="w-4 h-4 fill-current" />
            <span className="font-semibold text-sm">{repo.stars?.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-indigo-400">
            <TrendingUp className="w-4 h-4" />
            <span className="font-semibold text-sm">{repo.score}/100</span>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div>
        {repo.overview && (
          <Section
            title="Overview"
            icon={Activity}
            sectionKey="overview"
            content={<p className="leading-relaxed">{repo.overview}</p>}
          />
        )}

        {repo.activity && (
          <Section
            title="Activity"
            icon={GitFork}
            sectionKey="activity"
            content={
              <div className="space-y-2">
                {repo.activity.commits && (
                  <div>
                    <span className="text-gray-400 text-xs">Commits:</span>
                    <p>{repo.activity.commits}</p>
                  </div>
                )}
                {repo.activity.contributors && (
                  <div>
                    <span className="text-gray-400 text-xs">Contributors:</span>
                    <p>{repo.activity.contributors}</p>
                  </div>
                )}
                {repo.activity.lastUpdate && (
                  <div>
                    <span className="text-gray-400 text-xs">Last Update:</span>
                    <p>{repo.activity.lastUpdate}</p>
                  </div>
                )}
              </div>
            }
          />
        )}

        {repo.health && (
          <Section
            title="Health"
            icon={CheckCircle}
            sectionKey="health"
            content={
              <div className="space-y-2">
                {repo.health.issues && (
                  <div>
                    <span className="text-gray-400 text-xs">Issues:</span>
                    <p>{repo.health.issues}</p>
                  </div>
                )}
                {repo.health.pullRequests && (
                  <div>
                    <span className="text-gray-400 text-xs">Pull Requests:</span>
                    <p>{repo.health.pullRequests}</p>
                  </div>
                )}
                {repo.health.maintenance && (
                  <div>
                    <span className="text-gray-400 text-xs">Maintenance:</span>
                    <p>{repo.health.maintenance}</p>
                  </div>
                )}
              </div>
            }
          />
        )}

        {repo.technical && (
          <Section
            title="Technical Details"
            icon={Package}
            sectionKey="technical"
            content={
              <div className="space-y-2">
                {repo.technical.dependencies && (
                  <div>
                    <span className="text-gray-400 text-xs">Dependencies:</span>
                    <p>{repo.technical.dependencies}</p>
                  </div>
                )}
                {repo.technical.size && (
                  <div>
                    <span className="text-gray-400 text-xs">Size:</span>
                    <p>{repo.technical.size}</p>
                  </div>
                )}
                {repo.technical.topics && repo.technical.topics.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-xs">Topics:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {repo.technical.topics.map((topic, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            }
          />
        )}

        {repo.contribution && (
          <Section
            title="Contribution"
            icon={Users}
            sectionKey="contribution"
            content={
              <div className="space-y-2">
                {repo.contribution.difficulty && (
                  <div>
                    <span className="text-gray-400 text-xs">Difficulty:</span>
                    <p className="capitalize">{repo.contribution.difficulty}</p>
                  </div>
                )}
                {repo.contribution.opportunities && (
                  <div>
                    <span className="text-gray-400 text-xs">Opportunities:</span>
                    <p>{repo.contribution.opportunities}</p>
                  </div>
                )}
                {repo.contribution.guidelines && (
                  <div>
                    <span className="text-gray-400 text-xs">Guidelines:</span>
                    <p>{repo.contribution.guidelines}</p>
                  </div>
                )}
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
