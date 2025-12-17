
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

    useEffect(() => {
        let tempUrl: string | null = null;
        if (type === 'PDF' && url.startsWith('data:')) {
            const [meta, data] = url.split(',');
            if (meta && data) {
                const byteString = atob(data);
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: meta.split(':')[1].split(';')[0] });
                tempUrl = URL.createObjectURL(blob);
                setObjectUrl(tempUrl);
            }
        }

        return () => {
            if (tempUrl) {
                URL.revokeObjectURL(tempUrl);
            }
        };
    }, [url, type]);

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

    if (type === 'PDF' && objectUrl) {
        return (
            <div className="aspect-video w-full border rounded-lg bg-gray-100">
                <iframe
                    src={objectUrl}
                    className="w-full h-full"
                    title="PDF viewer"
                    frameBorder="0"
                />
            </div>
        );
    }
    
    // Fallback for uploaded SLIDES or other data URIs that can't be embedded
    if (url.startsWith('data:')) {
        return (
            <div className="aspect-video w-full border rounded-lg bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
                <h3 className="font-semibold text-lg">Download to View</h3>
                <p className="text-sm text-muted-foreground mb-4">This file format cannot be previewed directly. Please download it to view the content.</p>
                <Button asChild>
                    <a href={url} download={`module_content`}>
                        <Download className="mr-2 h-4 w-4"/>
                        Download File
                    </a>
                </Button>
            </div>
        );
    }

    return <p className="text-destructive">Unsupported content format or invalid URL.</p>;
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
                return <EmbeddedDocument url={module.content} type={module.type} />;
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
                    <div className="text-sm text-muted-foreground">
                        {isCompleted ? (
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                Module Completed
                            </div>
                        ) : (
                            <span>
                                {timeRemaining > 0 ? `Module completes in: ${formatTime(timeRemaining)}` : 'Completing...'}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
