

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

const EmbeddedDocument = ({ url, type }: { url: string, type: 'PDF' | 'SLIDES' }) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        let currentObjectUrl: string | null = null;
        if (url.startsWith('data:')) {
            const isPdf = type === 'PDF';
            if (isPdf) {
                 const fetchBlob = async () => {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    currentObjectUrl = URL.createObjectURL(blob);
                    setObjectUrl(currentObjectUrl);
                };
                fetchBlob();
            } else { // Handle slides
                // For slides, we use the form-post method which doesn't need a blob URL
                if (formRef.current) {
                    formRef.current.submit();
                }
            }

            return () => {
                if (isPdf && currentObjectUrl) {
                    URL.revokeObjectURL(currentObjectUrl);
                }
            };
        }
    }, [url, type]);
    
    // For publicly hosted files (PDF or Slides)
    if (url.startsWith('https://')) {
        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
         return (
            <div className="aspect-[4/3] w-full border rounded-lg bg-gray-100">
                <iframe
                    src={viewerUrl}
                    className="w-full h-full"
                    title="Document viewer"
                    frameBorder="0"
                />
            </div>
        );
    }
    
    // For uploaded PDFs
    if (url.startsWith('data:application/pdf')) {
        if (!objectUrl) return <p>Loading PDF...</p>;
        return (
            <div className="aspect-[4/3] w-full border rounded-lg bg-gray-100">
                <iframe
                    src={objectUrl}
                    className="w-full h-full"
                    title="Document viewer"
                    frameBorder="0"
                />
            </div>
        );
    }
    
    // For uploaded Slides
    if (url.startsWith('data:')) {
        const base64Data = url.split(',')[1];
        return (
             <div className="aspect-[4/3] w-full border rounded-lg bg-gray-100">
                 <iframe 
                    name="office-viewer-frame" 
                    className="w-full h-full"
                    title="Document viewer"
                    frameBorder="0"
                 >
                 </iframe>
                 <form 
                    ref={formRef}
                    action="https://view.officeapps.live.com/op/embed.aspx" 
                    method="post" 
                    target="office-viewer-frame" 
                    className="hidden"
                >
                    <input name="base64" value={base64Data} type="hidden" />
                 </form>
             </div>
        );
    }

    return <p className="text-destructive">Unsupported document URL.</p>;
};


const NativePlayer = ({ url, onEnded, type }: { url: string, onEnded: () => void, type: 'video' | 'audio' }) => {
    if (type === 'video') {
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
    return (
        <audio
            controls
            src={url}
            onEnded={onEnded}
            className="w-full"
        >
            Your browser does not support the audio element.
        </audio>
    );
}

type ModuleContentProps = {
    module: Module;
    onAutoComplete: () => void;
    isCompleted: boolean;
}

export const ModuleContent = ({ module, onAutoComplete, isCompleted }: ModuleContentProps) => {
    const [timeRemaining, setTimeRemaining] = useState(module.duration * 60);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const isDocument = module.type === 'PDF' || module.type === 'SLIDES';

    useEffect(() => {
        if (isDocument && !isCompleted) {
            setTimeRemaining(module.duration * 60); 
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
             if (timerRef.current) {
                clearInterval(timerRef.current);
            }
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
                if (isDataUrl || isExternalUrl) {
                    return <NativePlayer url={module.content} onEnded={onAutoComplete} type="video" />
                }
                break;
            case 'AUDIO':
                 if (isDataUrl || isExternalUrl) {
                    return <NativePlayer url={module.content} onEnded={onAutoComplete} type="audio" />
                 }
                break;
            case 'PDF':
            case 'SLIDES':
                if (isDataUrl || isExternalUrl) {
                    return <EmbeddedDocument url={module.content} type={module.type} />;
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
            {isDocument && (
                 <div className="flex items-center justify-center pt-4">
                    <Button
                        variant="ghost"
                        disabled={true}
                        className="cursor-default text-muted-foreground"
                    >
                        {isCompleted ? (
                            <>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                Module Completed
                            </>
                        ) : (
                            <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {timeRemaining > 0 ? `Completed in ${formatTime(timeRemaining)}` : 'Module Completed!'}
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
};
