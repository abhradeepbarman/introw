import { useEffect, useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Sparkles,
  Briefcase,
  GraduationCap,
  Code2,
  User,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InterviewSummary } from '@/services/interview.service';

type TabType = 'pdf' | 'parsed';

interface ResumePreviewPanelProps {
  interview: InterviewSummary | null;
  onClose: () => void;
}

export function ResumePreviewPanel({ interview, onClose }: ResumePreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('pdf');
  const [pdfLoading, setPdfLoading] = useState(true);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (interview) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [interview]);

  // Reset tab & loading state when interview changes
  useEffect(() => {
    if (interview) {
      setActiveTab(interview.resumeUrl ? 'pdf' : 'parsed');
      setPdfLoading(true);
    }
  }, [interview]);

  if (!interview) return null;

  const resumeData = interview.resumeData;
  const resumeUrl = interview.resumeUrl;

  const formattedDate = new Date(interview.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-panel-title"
    >
      <div
        className="relative flex h-full w-full flex-col border-l border-border bg-card shadow-2xl transition-transform animate-in slide-in-from-right duration-300 sm:max-w-2xl md:max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-brand/10 text-brand">
                <FileText className="size-4" />
              </div>
              <div>
                <h2
                  id="resume-panel-title"
                  className="font-display text-lg font-semibold tracking-[-0.015em] text-foreground"
                >
                  Candidate résumé
                </h2>
                <p className="label-mono text-xs text-muted-foreground">
                  Uploaded {formattedDate}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {resumeUrl && (
              <>
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  title="Open PDF in new tab"
                >
                  <ExternalLink className="size-3.5" />
                  <span className="hidden sm:inline">Open</span>
                </a>
                <a
                  href={resumeUrl}
                  download={`resume-${interview.id}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  title="Download PDF"
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              aria-label="Close résumé preview"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs (if parsed data is available) */}
        {resumeData && resumeUrl && (
          <div className="flex border-b border-border bg-muted/40 px-6 py-2">
            <div className="inline-flex rounded-lg border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setActiveTab('pdf')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 label-mono text-xs transition-colors',
                  activeTab === 'pdf'
                    ? 'bg-brand text-brand-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <FileText className="size-3.5" />
                Original PDF
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('parsed')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 label-mono text-xs transition-colors',
                  activeTab === 'parsed'
                    ? 'bg-brand text-brand-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Sparkles className="size-3.5" />
                Extracted profile
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'pdf' && resumeUrl ? (
            <div className="relative h-full min-h-[500px] w-full bg-muted/30">
              {pdfLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/80 p-6 text-center">
                  <div className="size-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                  <p className="label-mono text-xs text-muted-foreground">Loading résumé PDF...</p>
                </div>
              )}
              <iframe
                src={`${resumeUrl}#toolbar=0&navpanes=0`}
                title="Candidate résumé PDF"
                className="h-full w-full border-0"
                onLoad={() => setPdfLoading(false)}
              />
            </div>
          ) : resumeData ? (
            <div className="space-y-8 p-6">
              {/* Profile Header */}
              {(resumeData.name || resumeData.headline) && (
                <div className="rounded-xl border border-border bg-muted/30 p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                      <User className="size-5" />
                    </div>
                    <div>
                      {resumeData.name && (
                        <h3 className="font-display text-xl font-bold tracking-[-0.02em] text-foreground">
                          {resumeData.name}
                        </h3>
                      )}
                      {resumeData.headline && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{resumeData.headline}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Skills */}
              {resumeData.skills && resumeData.skills.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <Code2 className="size-4 text-brand" />
                    <span>Skills & Technologies</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2.5 py-1 font-mono text-xs font-medium text-foreground transition-colors hover:border-brand/40"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {resumeData.experience && resumeData.experience.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <Briefcase className="size-4 text-brand" />
                    <span>Experience</span>
                  </div>
                  <div className="space-y-3">
                    {resumeData.experience.map((exp, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-1">
                          <h4 className="font-display font-semibold text-foreground">{exp.role}</h4>
                          {exp.duration && (
                            <span className="label-mono text-xs text-muted-foreground">
                              {exp.duration}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-brand">{exp.company}</p>

                        {exp.highlights && exp.highlights.length > 0 && (
                          <ul className="mt-2.5 space-y-1.5 text-xs text-muted-foreground">
                            {exp.highlights.map((item, hIdx) => (
                              <li key={hIdx} className="flex items-start gap-2">
                                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand/60" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {resumeData.projects && resumeData.projects.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <Sparkles className="size-4 text-brand" />
                    <span>Key Projects</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {resumeData.projects.map((proj, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col justify-between rounded-xl border border-border bg-card p-4"
                      >
                        <div>
                          <h4 className="font-display font-semibold text-foreground">{proj.name}</h4>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {proj.description}
                          </p>
                        </div>
                        {proj.technologies && proj.technologies.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1 border-t border-border/60 pt-2.5">
                            {proj.technologies.map((tech, tIdx) => (
                              <span
                                key={tIdx}
                                className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {resumeData.education && resumeData.education.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <GraduationCap className="size-4 text-brand" />
                    <span>Education</span>
                  </div>
                  <ul className="space-y-2">
                    {resumeData.education.map((edu, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground"
                      >
                        <CheckCircle2 className="size-4 shrink-0 text-brand" />
                        <span>{edu}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <FileText className="size-12 opacity-30" />
              <p className="mt-3 font-display font-medium text-foreground">
                No preview data available
              </p>
              <p className="mt-1 text-xs">
                This interview does not have an attached résumé file or parsed profile.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
