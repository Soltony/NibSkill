
"use client";

import React from 'react';
import type { Module } from '@/lib/data';
import { Button } from './ui/button';
import { ExternalLink } from 'lucide-react';

const YouTubeEmbed = ({ url }: { url: string }) => {
    try {
        const urlObj = new URL(url);
        let videoId = urlObj.searchParams.get('v');
        if (!videoId && urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.slice(1);
        }

        if (!videoId) {
            return <p>Invalid YouTube URL provided.</p>;
        }

        return (
            <div className="aspect-video w-full">
                <iframe
                    className="w-full h-full rounded-lg"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        );
    } catch (error) {
        return <p>Invalid URL format.</p>
    }
};

export const ModuleContent = ({ module }: { module: Module }) => {

    const renderContent = () => {
        if (!module.content) {
            return <p className="text-muted-foreground">No content has been assigned to this module yet.</p>
        }

        if (module.type === 'video' && (module.content.includes('youtube.com') || module.content.includes('youtu.be'))) {
            return <YouTubeEmbed url={module.content} />;
        }
        
        if (module.type === 'pdf' || module.type === 'slides' || module.type === 'video') {
            return (
                 <Button asChild variant="outline">
                    <a href={module.content} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open {module.type} content
                    </a>
                </Button>
            );
        }

        return <p className="text-muted-foreground">Unsupported module type.</p>;
    }


    return (
        <div className="space-y-4">
            <p className="text-muted-foreground">{module.description}</p>
            <div>
               {renderContent()}
            </div>
        </div>
    );
};
