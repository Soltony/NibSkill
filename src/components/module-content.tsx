

"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { Module } from '@prisma/client';
import { Button } from './ui/button';
import { ExternalLink, CheckCircle } from 'lucide-react';
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
        if (url.startsWith('data:')) {
            const fetchBlob = async () => {
                const response = await fetch(url);
                const blob = await response.blob();
                const objUrl = URL.createObjectURL(blob);
                setObjectUrl(objUrl);
            };
            fetchBlob();

            return () => {
                if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                }
            };
        }
    }, [url, objectUrl]);
    
    const displayUrl = url.startsWith('data:') ? objectUrl : url;

    if (!displayUrl) {
        return <p>Loading document...</p>;
    }

    return (
        <div className="aspect-[4/3] w-full border rounded-lg bg-gray-100">
            <iframe
                src={displayUrl}
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

    const isMedia = module.type === 'VIDEO' || module.type === 'AUDIO';
    const isDocument = module.type === 'PDF' || module.type === 'SLIDES';

    useEffect(() => {
        if (isDocument && !isCompleted && !isTimerRunning) {
            setIsTimerRunning(true);
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isDocument, isCompleted, isTimerRunning, module.duration]);


    const handleCompleteClick = () => {
        onAutoComplete();
        toast({
            title: "Module Completed",
            description: `You have completed "${module.title}".`,
        });
    };
    
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
            case 'SLIDES':
                if (isDataUrl) {
                    return <EmbeddedDocument url={module.content} />;
                }
                if (isExternalUrl) {
                    const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(module.content)}&embedded=true`;
                    return <EmbeddedDocument url={viewerUrl} />;
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
                        onClick={handleCompleteClick}
                        disabled={timeRemaining > 0}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {timeRemaining > 0 ? `Complete in ${formatTime(timeRemaining)}` : 'Complete Module'}
                    </Button>
                </div>
            )}
        </div>
    );
};
