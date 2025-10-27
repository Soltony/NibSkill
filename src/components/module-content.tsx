
"use client";

import React from 'react';
import type { Module } from '@/lib/data';
import { Button } from './ui/button';
import { ExternalLink, Download } from 'lucide-react';

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

const LocalVideoPlayer = ({ url }: { url: string }) => {
    return (
        <div className="aspect-video w-full">
            <video
                controls
                className="w-full h-full rounded-lg bg-black"
                src={url}
            >
                Your browser does not support the video tag.
            </video>
        </div>
    );
}

const LocalAudioPlayer = ({ url }: { url: string }) => {
    return (
        <div>
            <audio
                controls
                className="w-full rounded-lg"
                src={url}
            >
                Your browser does not support the audio tag.
            </audio>
        </div>
    );
}

export const ModuleContent = ({ module }: { module: Module }) => {

    const isUploadedContent = module.content.startsWith('data:');
    const isExternalUrl = module.content.startsWith('https://');
    const isYouTubeUrl = isExternalUrl && (module.content.includes('youtube.com') || module.content.includes('youtu.be'));

    const renderContent = () => {
        if (!module.content) {
            return <p className="text-muted-foreground">No content has been assigned to this module yet.</p>
        }

        switch (module.type) {
            case 'video':
                if (isYouTubeUrl) return <YouTubeEmbed url={module.content} />;
                if (isUploadedContent) return <LocalVideoPlayer url={module.content} />;
                break;
            case 'audio':
                if (isUploadedContent) return <LocalAudioPlayer url={module.content} />;
                break;
            case 'pdf':
            case 'slides':
                 if (isUploadedContent) {
                    return (
                        <Button asChild>
                           <a href={module.content} download={`nibtraining_${module.type}_${module.id}`}>
                               <Download className="mr-2 h-4 w-4" />
                               Download Material
                           </a>
                       </Button>
                   );
                }
                break;
        }

        if (isExternalUrl) {
            return (
                 <Button asChild variant="outline">
                    <a href={module.content} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open External Content
                    </a>
                </Button>
            );
        }

        return <p className="text-muted-foreground">Unsupported or invalid content link for this module.</p>;
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
