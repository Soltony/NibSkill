

"use client";

import React, { useEffect, useState } from 'react';
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

const LocalVideoPlayer = ({ url, onEnded }: { url: string, onEnded: () => void }) => {
    return (
        <div className="aspect-video w-full">
            <video
                controls
                className="w-full h-full rounded-lg bg-black"
                src={url}
                onEnded={onEnded}
            >
                Your browser does not support the video tag.
            </video>
        </div>
    );
}

const LocalAudioPlayer = ({ url, onEnded }: { url: string, onEnded: () => void }) => {
    return (
        <div>
            <audio
                controls
                className="w-full rounded-lg"
                src={url}
                onEnded={onEnded}
            >
                Your browser does not support the audio tag.
            </audio>
        </div>
    );
}

const EmbeddedDocument = ({ module }: { module: Module }) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (module.content.startsWith('data:')) {
            const fetchAndCreateUrl = async () => {
                const response = await fetch(module.content);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                setObjectUrl(url);
            };

            fetchAndCreateUrl();

            return () => {
                if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                }
            };
        } else {
            setObjectUrl(module.content);
        }
    // We only want this to run when the module content changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [module.content]);

    if (!objectUrl) {
        return <p>Loading document...</p>;
    }
    
    return (
        <div className="aspect-video w-full border rounded-lg bg-gray-100">
            <iframe
                src={objectUrl}
                className="w-full h-full"
                title={module.title}
            />
        </div>
    );
};

type ModuleContentProps = {
    module: Module;
    onAutoComplete: () => void;
}

export const ModuleContent = ({ module, onAutoComplete }: ModuleContentProps) => {

    const isUploadedContent = module.content.startsWith('data:');
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
                if (isUploadedContent) {
                    return <LocalVideoPlayer url={module.content} onEnded={onAutoComplete} />;
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
                if (isUploadedContent) {
                    return <LocalAudioPlayer url={module.content} onEnded={onAutoComplete} />;
                }
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
                return <EmbeddedDocument module={module} />;
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
