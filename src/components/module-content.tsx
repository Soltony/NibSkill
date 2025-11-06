

"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { Module } from '@prisma/client';
import { Button } from './ui/button';
import { ExternalLink, CheckCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const YouTubeEmbed = ({ url, onEnded }: { url: string, onEnded: () => void }) => {
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
                    onEnded={onEnded}
                ></iframe>
            </div>
        );
    } catch (error) {
        return <p>Invalid URL format.</p>
    }
};

const EmbeddedDocument = ({ url }: { url: string }) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        let currentObjectUrl: string | null = null;
        if (url.startsWith('data:')) {
            const fetchBlob = async () => {
                const response = await fetch(url);
                const blob = await response.blob();
                currentObjectUrl = URL.createObjectURL(blob);
                setObjectUrl(currentObjectUrl);
            };
            fetchBlob();

            return () => {
                if (currentObjectUrl) {
                    URL.revokeObjectURL(currentObjectUrl);
                }
            };
        }
    }, [url]);
    
    const displayUrl = url.startsWith('data:') ? objectUrl : url;

    if (url.startsWith('data:') && !displayUrl) {
        return <p>Loading document...</p>;
    }

    return (
        <div className="aspect-[4/3] w-full border rounded-lg bg-gray-100">
            <iframe
                src={displayUrl!}
                className="w-full h-full"
                title="Document viewer"
                frameBorder="0"
            />
        </div>
    );
};

const NativePlayer = ({ url, onEnded }: { url: string, onEnded: () => void }) => {
    return (
        <div className="aspect-video w-full">
            <video
                controls
                src={url}
                onEnded={onEnded}
                className="w-full h-full rounded-lg bg-black"
            >
                Your browser does not support the video tag.
            </video>
        </div>
    );
}

type ModuleContentProps = {
    module: Module;
    onAutoComplete: () => void;
    isCompleted: boolean;
}

export const ModuleContent = ({ module, onAutoComplete, isCompleted }: ModuleContentProps) => {
    const { toast } = useToast();
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(module.duration * 60);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const isDocument = module.type === 'PDF' || module.type === 'SLIDES';

    useEffect(() => {
        // Timer logic only for documents that are not yet completed
        if (isDocument && !isCompleted) {
            setIsTimerRunning(true);
            setTimeRemaining(module.duration * 60); // Reset timer on module change
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        onAutoComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
             // Stop timer if module is already completed or not a document
             if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            setIsTimerRunning(false);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [module.id, isDocument, isCompleted, module.duration, onAutoComplete]);


    const isExternalUrl = module.content.startsWith('https://');
    const isYouTubeUrl = isExternalUrl && (module.content.includes('youtube.com') || module.content.includes('youtu.be'));
    const isDataUrl = module.content.startsWith('data:');
    
    const renderContent = () => {
        if (!module.content) {
            return <p className="text-muted-foreground">No content has been assigned to this module yet.</p>
        }

        switch (module.type) {
            case 'VIDEO':
                if (isYouTubeUrl) {
                    return <YouTubeEmbed url={module.content} onEnded={onAutoComplete} />;
                }
                if (isDataUrl) {
                    return <NativePlayer url={module.content} onEnded={onAutoComplete} />
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
                 if (isDataUrl) {
                    return <audio controls src={module.content} onEnded={onAutoComplete} className="w-full" />
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
                if (isDataUrl || isExternalUrl) {
                    return <EmbeddedDocument url={module.content} />;
                }
                break;
            case 'SLIDES':
                if (isExternalUrl) { // Only embed public URLs for slides
                    const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(module.content)}&embedded=true`;
                    return <EmbeddedDocument url={viewerUrl} />;
                }
                if (isDataUrl) { // Fallback to download for uploaded slides
                    return (
                        <Button asChild variant="outline">
                            <a href={module.content} download={module.title}>
                                <Download className="mr-2 h-4 w-4" />
                                Download Presentation
                            </a>
                        </Button>
                    );
                }
                break;
        }

        return <p className="text-destructive">Unsupported content format.</p>
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-4">
            <p className="text-muted-foreground">{module.description}</p>
            <div>
               {renderContent()}
            </div>
            {isDocument && !isCompleted && (
                 <div className="flex items-center justify-center pt-4">
                    <Button
                        disabled={timeRemaining > 0}
                        className="cursor-default"
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {timeRemaining > 0 ? `Completed in ${formatTime(timeRemaining)}` : 'Module Completed!'}
                    </Button>
                </div>
            )}
        </div>
    );
};
