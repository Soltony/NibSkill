

"use client";

import React from 'react';
import type { Module } from '@prisma/client';
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

const EmbeddedDocument = ({ url }: { url: string }) => {
    if (!url.startsWith('https://')) {
        return (
             <Button asChild variant="outline">
                <a href={url} download>Download Material</a>
            </Button>
        );
    }
    return (
        <div className="aspect-video w-full border rounded-lg bg-gray-100">
            <iframe
                src={`https://docs.google.com/gview?url=${url}&embedded=true`}
                className="w-full h-full"
                title="Document viewer"
                frameBorder="0"
            />
        </div>
    );
};

type ModuleContentProps = {
    module: Module;
    onAutoComplete: () => void;
}

export const ModuleContent = ({ module, onAutoComplete }: ModuleContentProps) => {

    const isExternalUrl = module.content.startsWith('https://');
    const isYouTubeUrl = isExternalUrl && (module.content.includes('youtube.com') || module.content.includes('youtu.be'));

    const renderContent = () => {
        if (!module.content) {
            return <p className="text-muted-foreground">No content has been assigned to this module yet.</p>
        }

        switch (module.type) {
            case 'VIDEO':
                if (isYouTubeUrl) {
                    return <YouTubeEmbed url={module.content} />;
                }
                if (isExternalUrl) {
                    return (
                        <Button asChild variant="outline">
                            <a href={module.content} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open External Video
                            </a>
                        </Button>
                    );
                }
                break;

            case 'AUDIO':
                 if (isExternalUrl) {
                    return (
                        <Button asChild variant="outline">
                            <a href={module.content} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open External Audio
                            </a>
                        </Button>
                    );
                }
                break;
            case 'PDF':
            case 'SLIDES':
                return <EmbeddedDocument url={module.content} />;
        }

        return (
            <Button asChild variant="outline">
                <a href={module.content} download>Download Material</a>
            </Button>
        )
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
