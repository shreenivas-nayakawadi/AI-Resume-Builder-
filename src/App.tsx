import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ChangeEvent, ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';

type ArtifactStatus = '' | 'worked' | 'error';

type StepArtifact = {
  notes: string;
  status: ArtifactStatus;
  screenshotName: string;
  uploadedAt: string;
};

type ProofLinks = {
  lovable: string;
  github: string;
  deploy: string;
};

type BuildStep = {
  number: number;
  route: string;
  title: string;
  subtitle: string;
  prompt: string;
};

type EducationEntry = {
  id: string;
  school: string;
  degree: string;
  year: string;
};

type ExperienceEntry = {
  id: string;
  company: string;
  role: string;
  duration: string;
  bullet: string;
};

type ProjectEntry = {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  liveUrl: string;
  githubUrl: string;
};

type ResumeDraft = {
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  technicalSkills: string[];
  softSkills: string[];
  toolsTechnologies: string[];
  github: string;
  linkedin: string;
};

type ResumeTemplate = 'Classic' | 'Modern' | 'Minimal';
type AccentThemeId = 'teal' | 'navy' | 'burgundy' | 'forest' | 'charcoal';
type AccentTheme = {
  id: AccentThemeId;
  label: string;
  color: string;
};

const STEPS: BuildStep[] = [
  {
    number: 1,
    route: '/rb/01-problem',
    title: 'Problem',
    subtitle: 'Define the candidate pain points and product intent.',
    prompt: 'Document the resume building problems this SaaS solves and list non-goals for MVP.',
  },
  {
    number: 2,
    route: '/rb/02-market',
    title: 'Market',
    subtitle: 'Frame ICP, alternatives, and value proposition.',
    prompt: 'Map target users, alternatives, and why this product wins now.',
  },
  {
    number: 3,
    route: '/rb/03-architecture',
    title: 'Architecture',
    subtitle: 'Choose major systems and platform boundaries.',
    prompt: 'Propose architecture blocks, data flow, and external integrations.',
  },
  {
    number: 4,
    route: '/rb/04-hld',
    title: 'High-Level Design',
    subtitle: 'Lay out component-level responsibilities.',
    prompt: 'Create HLD with modules, ownership, and request/response boundaries.',
  },
  {
    number: 5,
    route: '/rb/05-lld',
    title: 'Low-Level Design',
    subtitle: 'Define implementation details and contracts.',
    prompt: 'Break the design into APIs, schemas, validations, and failure handling.',
  },
  {
    number: 6,
    route: '/rb/06-build',
    title: 'Build',
    subtitle: 'Implement features according to approved design docs.',
    prompt: 'Implement iteratively and capture artifact evidence for each milestone.',
  },
  {
    number: 7,
    route: '/rb/07-test',
    title: 'Test',
    subtitle: 'Validate quality, reliability, and edge behavior.',
    prompt: 'Run verification and break tests, then capture pass/fail evidence.',
  },
  {
    number: 8,
    route: '/rb/08-ship',
    title: 'Ship',
    subtitle: 'Prepare launch package and release handoff.',
    prompt: 'Finalize release checklist and deployment notes for submission.',
  },
];

const PROOF_ROUTE = '/rb/proof';
const PROOF_LINKS_KEY = 'rb_proof_links';
const RESUME_STORAGE_KEY = 'resumeBuilderData';
const TEMPLATE_STORAGE_KEY = 'resumeBuilderTemplate';
const ACCENT_STORAGE_KEY = 'resumeBuilderAccentTheme';
const NAV_ITEMS = [
  { label: 'Builder', to: '/builder' },
  { label: 'Preview', to: '/preview' },
  { label: 'Proof', to: '/proof' },
];
const TEMPLATE_OPTIONS: ResumeTemplate[] = ['Classic', 'Modern', 'Minimal'];
const ACCENT_THEMES: AccentTheme[] = [
  { id: 'teal', label: 'Teal', color: 'hsl(168, 60%, 40%)' },
  { id: 'navy', label: 'Navy', color: 'hsl(220, 60%, 35%)' },
  { id: 'burgundy', label: 'Burgundy', color: 'hsl(345, 60%, 35%)' },
  { id: 'forest', label: 'Forest', color: 'hsl(150, 50%, 30%)' },
  { id: 'charcoal', label: 'Charcoal', color: 'hsl(0, 0%, 25%)' },
];
const ACTION_VERBS = ['Built', 'Developed', 'Designed', 'Implemented', 'Led', 'Improved', 'Created', 'Optimized', 'Automated'];
const TECHNICAL_SUGGESTIONS = ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'GraphQL'];
const SOFT_SUGGESTIONS = ['Team Leadership', 'Problem Solving'];
const TOOLS_SUGGESTIONS = ['Git', 'Docker', 'AWS'];

type AtsResult = {
  score: number;
  suggestions: string[];
};

const getArtifactKey = (stepNumber: number) => `rb_step_${stepNumber}_artifact`;

const parseJson = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const getInitialArtifacts = () => {
  const map: Record<number, StepArtifact | null> = {};
  for (const step of STEPS) {
    map[step.number] = parseJson<StepArtifact>(localStorage.getItem(getArtifactKey(step.number)));
  }
  return map;
};

const getFirstIncompleteStep = (artifacts: Record<number, StepArtifact | null>) => {
  const pending = STEPS.find((step) => !artifacts[step.number]?.uploadedAt);
  return pending?.number ?? null;
};

const getProofLinks = (): ProofLinks => {
  return (
    parseJson<ProofLinks>(localStorage.getItem(PROOF_LINKS_KEY)) ?? {
      lovable: '',
      github: '',
      deploy: '',
    }
  );
};

const createEducationEntry = (): EducationEntry => ({ id: crypto.randomUUID(), school: '', degree: '', year: '' });
const createExperienceEntry = (): ExperienceEntry => ({ id: crypto.randomUUID(), company: '', role: '', duration: '', bullet: '' });
const createProjectEntry = (): ProjectEntry => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  techStack: [],
  liveUrl: '',
  githubUrl: '',
});

const toSafeString = (value: unknown) => (typeof value === 'string' ? value : '');

const readResumeDraft = (): ResumeDraft => {
  const parsed = parseJson<unknown>(localStorage.getItem(RESUME_STORAGE_KEY));
  if (!parsed || typeof parsed !== 'object') {
    return {
      name: '',
      email: '',
      phone: '',
      location: '',
      summary: '',
      education: [createEducationEntry()],
      experience: [createExperienceEntry()],
      projects: [createProjectEntry()],
      technicalSkills: [],
      softSkills: [],
      toolsTechnologies: [],
      github: '',
      linkedin: '',
    };
  }

  const raw = parsed as Record<string, unknown>;
  const education = Array.isArray(raw.education)
    ? raw.education
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        id: toSafeString(item.id) || crypto.randomUUID(),
        school: toSafeString(item.school),
        degree: toSafeString(item.degree),
        year: toSafeString(item.year),
      }))
    : [];

  const experience = Array.isArray(raw.experience)
    ? raw.experience
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        id: toSafeString(item.id) || crypto.randomUUID(),
        company: toSafeString(item.company),
        role: toSafeString(item.role),
        duration: toSafeString(item.duration),
        bullet: toSafeString(item.bullet),
      }))
    : [];

  const projects = Array.isArray(raw.projects)
    ? raw.projects
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        id: toSafeString(item.id) || crypto.randomUUID(),
        title: toSafeString(item.title),
        description: toSafeString(item.description),
        techStack: Array.isArray(item.techStack)
          ? item.techStack.map((tech) => toSafeString(tech)).filter(Boolean)
          : [],
        liveUrl: toSafeString(item.liveUrl),
        githubUrl: toSafeString(item.githubUrl),
      }))
    : [];

  const parseSkillArray = (value: unknown) =>
    Array.isArray(value) ? value.map((item) => toSafeString(item).trim()).filter(Boolean) : [];
  const technicalSkills = parseSkillArray(raw.technicalSkills);
  const softSkills = parseSkillArray(raw.softSkills);
  const toolsTechnologies = parseSkillArray(raw.toolsTechnologies);

  const legacySkills = toSafeString(raw.skills)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    name: toSafeString(raw.name),
    email: toSafeString(raw.email),
    phone: toSafeString(raw.phone),
    location: toSafeString(raw.location),
    summary: toSafeString(raw.summary),
    education: education.length ? education : [createEducationEntry()],
    experience: experience.length ? experience : [createExperienceEntry()],
    projects: projects.length ? projects : [createProjectEntry()],
    technicalSkills: technicalSkills.length ? technicalSkills : legacySkills,
    softSkills,
    toolsTechnologies,
    github: toSafeString(raw.github),
    linkedin: toSafeString(raw.linkedin),
  };
};

const nonEmptyEducation = (draft: ResumeDraft) =>
  draft.education.filter((entry) => entry.school.trim() || entry.degree.trim() || entry.year.trim());

const nonEmptyExperience = (draft: ResumeDraft) =>
  draft.experience.filter((entry) => entry.company.trim() || entry.role.trim() || entry.duration.trim() || entry.bullet.trim());

const nonEmptyProjects = (draft: ResumeDraft) =>
  draft.projects.filter(
    (entry) =>
      entry.title.trim() ||
      entry.description.trim() ||
      entry.techStack.length > 0 ||
      entry.liveUrl.trim() ||
      entry.githubUrl.trim(),
  );

const skillItems = (draft: ResumeDraft) =>
  [...draft.technicalSkills, ...draft.softSkills, ...draft.toolsTechnologies];

const computeAtsResult = (draft: ResumeDraft): AtsResult => {
  let score = 0;
  const suggestions: string[] = [];
  const summary = draft.summary.trim();
  const summaryHasActionVerb = /\b(built|led|designed|improved|implemented|created|optimized|developed|automated)\b/i.test(summary);
  const hasExperienceWithBullet = nonEmptyExperience(draft).some((entry) => entry.bullet.trim().length > 0);
  const hasEducation = nonEmptyEducation(draft).length > 0;
  const totalSkills = skillItems(draft).length;
  const hasProject = nonEmptyProjects(draft).length > 0;

  if (draft.name.trim()) score += 10;
  else suggestions.push('Add your full name (+10 points).');

  if (draft.email.trim()) score += 10;
  else suggestions.push('Add an email address (+10 points).');

  if (summary.length > 50) score += 10;
  else suggestions.push('Add a professional summary (+10 points).');

  if (hasExperienceWithBullet) score += 15;
  else suggestions.push('Add an experience entry with bullet impact (+15 points).');

  if (hasEducation) score += 10;
  else suggestions.push('Add at least one education entry (+10 points).');

  if (totalSkills >= 5) score += 10;
  else suggestions.push('Add at least 5 skills (+10 points).');

  if (hasProject) score += 10;
  else suggestions.push('Add at least one project (+10 points).');

  if (draft.phone.trim()) score += 5;
  else suggestions.push('Add your phone number (+5 points).');

  if (draft.linkedin.trim()) score += 5;
  else suggestions.push('Add your LinkedIn URL (+5 points).');

  if (draft.github.trim()) score += 5;
  else suggestions.push('Add your GitHub URL (+5 points).');

  if (summaryHasActionVerb) score += 10;
  else suggestions.push('Use action verbs in summary (+10 points).');

  return { score: Math.min(100, score), suggestions };
};

const readTemplateChoice = (): ResumeTemplate => {
  const value = localStorage.getItem(TEMPLATE_STORAGE_KEY);
  if (value === 'Classic' || value === 'Modern' || value === 'Minimal') return value;
  return 'Classic';
};

const readAccentChoice = (): AccentTheme => {
  const value = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentThemeId | null;
  return ACCENT_THEMES.find((theme) => theme.id === value) ?? ACCENT_THEMES[0];
};

const toTemplateClass = (template: ResumeTemplate) => `template-${template.toLowerCase()}`;

const startsWithActionVerb = (text: string) => {
  const cleaned = text.trim();
  if (!cleaned) return true;
  return ACTION_VERBS.some((verb) => new RegExp(`^${verb}\\b`, 'i').test(cleaned));
};

const hasNumericIndicator = (text: string) => /(\d|%|x|k)/i.test(text);

const getBulletGuidance = (text: string) => {
  const guidance: string[] = [];
  if (!text.trim()) return guidance;
  if (!startsWithActionVerb(text)) guidance.push('Start with a strong action verb.');
  if (!hasNumericIndicator(text)) guidance.push('Add measurable impact (numbers).');
  return guidance;
};

const computeTopImprovements = (draft: ResumeDraft) => computeAtsResult(draft).suggestions.slice(0, 3);

const shouldWarnIncomplete = (draft: ResumeDraft) => {
  const hasName = Boolean(draft.name.trim());
  const hasProjectOrExperience = nonEmptyProjects(draft).length > 0 || nonEmptyExperience(draft).length > 0;
  return !hasName || !hasProjectOrExperience;
};

const toPlainTextResume = (draft: ResumeDraft) => {
  const lines: string[] = [];
  const contact = [draft.email, draft.phone, draft.location].map((item) => item.trim()).filter(Boolean).join(' | ');
  const education = nonEmptyEducation(draft);
  const experience = nonEmptyExperience(draft);
  const projects = nonEmptyProjects(draft);
  const skills = skillItems(draft);

  lines.push('Name');
  lines.push(draft.name.trim() || '-');
  lines.push('');

  lines.push('Contact');
  lines.push(contact || '-');
  lines.push('');

  if (draft.summary.trim()) {
    lines.push('Summary');
    lines.push(draft.summary.trim());
    lines.push('');
  }

  if (education.length) {
    lines.push('Education');
    education.forEach((entry) => {
      lines.push(`- ${[entry.school, entry.degree, entry.year].filter((item) => item.trim()).join(' | ')}`);
    });
    lines.push('');
  }

  if (experience.length) {
    lines.push('Experience');
    experience.forEach((entry) => {
      lines.push(`- ${[entry.company, entry.role, entry.duration].filter((item) => item.trim()).join(' | ')}`);
      if (entry.bullet.trim()) lines.push(`  ${entry.bullet.trim()}`);
    });
    lines.push('');
  }

  if (projects.length) {
    lines.push('Projects');
    projects.forEach((entry) => {
      lines.push(`- ${entry.title.trim() || 'Project'}`);
      if (entry.description.trim()) lines.push(`  ${entry.description.trim()}`);
      if (entry.techStack.length) lines.push(`  Tech Stack: ${entry.techStack.join(', ')}`);
      if (entry.liveUrl.trim()) lines.push(`  Live: ${entry.liveUrl.trim()}`);
      if (entry.githubUrl.trim()) lines.push(`  GitHub: ${entry.githubUrl.trim()}`);
    });
    lines.push('');
  }

  if (skills.length) {
    lines.push('Skills');
    if (draft.technicalSkills.length) lines.push(`Technical Skills: ${draft.technicalSkills.join(', ')}`);
    if (draft.softSkills.length) lines.push(`Soft Skills: ${draft.softSkills.join(', ')}`);
    if (draft.toolsTechnologies.length) lines.push(`Tools & Technologies: ${draft.toolsTechnologies.join(', ')}`);
    lines.push('');
  }

  if (draft.github.trim() || draft.linkedin.trim()) {
    lines.push('Links');
    if (draft.github.trim()) lines.push(draft.github.trim());
    if (draft.linkedin.trim()) lines.push(draft.linkedin.trim());
  }

  return lines.join('\n').trim();
};

type ShellProps = {
  currentStep: number | null;
  children: ReactNode;
};

function Shell({ currentStep, children }: ShellProps) {
  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__left">AI Resume Builder</div>
        <div className="top-bar__center">
          {currentStep ? `Project 3 - Step ${currentStep} of 8` : 'Project 3 - Proof'}
        </div>
        <StatusBadge />
      </header>
      {children}
      <footer className="proof-footer">
        <span>Proof Footer</span>
      </footer>
    </div>
  );
}

function StatusBadge() {
  const artifacts = getInitialArtifacts();
  const completed = STEPS.filter((step) => artifacts[step.number]?.uploadedAt).length;
  const status = completed === 0 ? 'Not Started' : completed === STEPS.length ? 'Shipped' : 'In Progress';

  return <span className="status-badge">{status}</span>;
}

function StepPage() {
  const { stepSlug } = useParams();
  const navigate = useNavigate();
  const step = useMemo(() => STEPS.find((item) => item.route.endsWith(stepSlug ?? '')), [stepSlug]);
  const [artifacts, setArtifacts] = useState<Record<number, StepArtifact | null>>(() => getInitialArtifacts());
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ArtifactStatus>('');
  const [screenshotName, setScreenshotName] = useState('');
  const [copied, setCopied] = useState(false);
  const [lastAction, setLastAction] = useState('');
  const firstIncomplete = getFirstIncompleteStep(artifacts);

  useEffect(() => {
    if (!step) return;
    const existing = artifacts[step.number];
    setNotes(existing?.notes ?? '');
    setStatus(existing?.status ?? '');
    setScreenshotName(existing?.screenshotName ?? '');
  }, [step, artifacts]);

  useEffect(() => {
    if (!step) return;
    if (firstIncomplete !== null && step.number > firstIncomplete) {
      const fallback = STEPS[firstIncomplete - 1];
      navigate(fallback.route, { replace: true });
    }
  }, [step, firstIncomplete, navigate]);

  if (!step) {
    return <Navigate to={STEPS[0].route} replace />;
  }

  const isSaved = Boolean(artifacts[step.number]?.uploadedAt);
  const isLastStep = step.number === STEPS.length;
  const nextRoute = isLastStep ? PROOF_ROUTE : STEPS[step.number].route;

  const lockedStepThreshold = firstIncomplete === null ? STEPS.length : firstIncomplete;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(step.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleUploadArtifact = () => {
    const artifact: StepArtifact = {
      notes,
      status,
      screenshotName,
      uploadedAt: new Date().toISOString(),
    };
    localStorage.setItem(getArtifactKey(step.number), JSON.stringify(artifact));
    setArtifacts((prev) => ({ ...prev, [step.number]: artifact }));
  };

  const handleScreenshotChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setScreenshotName(file.name);
    setLastAction(`Screenshot selected: ${file.name}`);
  };

  const handleBuild = () => {
    window.open('https://lovable.dev/', '_blank', 'noopener,noreferrer');
  };

  return (
    <Shell currentStep={step.number}>
      <section className="context-header">
        <h1>{step.number}/8 {step.title}</h1>
        <p>{step.subtitle}</p>
      </section>

      <div className="workspace">
        <main className="workspace-main">
          <h2>Step Workspace</h2>
          <p>Artifact must be uploaded before continuing to the next step.</p>

          <label className="label" htmlFor="artifact-notes">Artifact Notes</label>
          <textarea
            id="artifact-notes"
            className="textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Paste the output link, summary, or checkpoint details."
          />

          <div className="action-row">
            <button
              type="button"
              className={`button ${status === 'worked' ? 'button-accent' : ''}`}
              onClick={() => {
                setStatus('worked');
                setLastAction('Marked: It Worked');
              }}
            >
              It Worked
            </button>
            <button
              type="button"
              className={`button ${status === 'error' ? 'button-accent' : ''}`}
              onClick={() => {
                setStatus('error');
                setLastAction('Marked: Error');
              }}
            >
              Error
            </button>
            <label className="button" htmlFor="artifact-screenshot">Add Screenshot</label>
            <input
              id="artifact-screenshot"
              className="hidden-input"
              type="file"
              accept="image/*"
              onChange={handleScreenshotChange}
            />
          </div>

          <button
            type="button"
            className="button button-accent"
            onClick={handleUploadArtifact}
            disabled={!notes.trim() && !status && !screenshotName}
          >
            Upload Artifact
          </button>

          <div className="artifact-status">
            <p>Storage Key: <code>{getArtifactKey(step.number)}</code></p>
            <p>{isSaved ? 'Artifact uploaded.' : 'Artifact not uploaded yet.'}</p>
            {screenshotName ? <p>Screenshot: {screenshotName}</p> : null}
            {lastAction ? <p>{lastAction}</p> : null}
          </div>

          <div className="step-nav">
            {step.number > 1 ? (
              <Link className="button" to={STEPS[step.number - 2].route}>
                Previous
              </Link>
            ) : (
              <span />
            )}
            <Link
              className={`button ${isSaved ? 'button-accent' : 'button-disabled'}`}
              to={isSaved ? nextRoute : '#'}
              onClick={(event) => {
                if (!isSaved) event.preventDefault();
              }}
              aria-disabled={!isSaved}
            >
              Next
            </Link>
          </div>
        </main>

        <aside className="workspace-side">
          <h3>Build Panel</h3>
          <label className="label" htmlFor="lovable-prompt">Copy This Into Lovable</label>
          <textarea id="lovable-prompt" className="textarea" value={step.prompt} readOnly />
          <div className="stack-actions">
            <button type="button" className="button button-accent" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" className="button" onClick={handleBuild}>
              Build in Lovable
            </button>
            <button type="button" className="button" onClick={() => setStatus('worked')}>
              It Worked
            </button>
            <button type="button" className="button" onClick={() => setStatus('error')}>
              Error
            </button>
            <label className="button" htmlFor="artifact-screenshot-panel">Add Screenshot</label>
            <input
              id="artifact-screenshot-panel"
              className="hidden-input"
              type="file"
              accept="image/*"
              onChange={handleScreenshotChange}
            />
          </div>

          <h3>Route Rail</h3>
          <div className="route-rail">
            {STEPS.map((item) => {
              const unlocked = item.number <= lockedStepThreshold;
              return (
                <Link
                  key={item.route}
                  className={`route-item ${item.number === step.number ? 'route-item-active' : ''} ${!unlocked ? 'route-item-locked' : ''}`}
                  to={unlocked ? item.route : '#'}
                  onClick={(event) => {
                    if (!unlocked) event.preventDefault();
                  }}
                >
                  {item.number}. {item.title}
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function ProofPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [artifacts] = useState<Record<number, StepArtifact | null>>(() => getInitialArtifacts());
  const firstIncomplete = getFirstIncompleteStep(artifacts);
  const [links, setLinks] = useState<ProofLinks>(() => getProofLinks());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (firstIncomplete !== null) {
      navigate(STEPS[firstIncomplete - 1].route, { replace: true, state: { from: location.pathname } });
    }
  }, [firstIncomplete, navigate, location.pathname]);

  const handleLinkChange = (field: keyof ProofLinks, value: string) => {
    const nextLinks = { ...links, [field]: value };
    setLinks(nextLinks);
    localStorage.setItem(PROOF_LINKS_KEY, JSON.stringify(nextLinks));
  };

  const handleCopySubmission = async () => {
    const summary = [
      'AI Resume Builder - Build Track Final Submission',
      ...STEPS.map((step) => {
        const artifact = artifacts[step.number];
        return `Step ${step.number} (${step.title}): ${artifact?.uploadedAt ? 'Complete' : 'Pending'}`;
      }),
      `Lovable: ${links.lovable || 'N/A'}`,
      `GitHub: ${links.github || 'N/A'}`,
      `Deploy: ${links.deploy || 'N/A'}`,
    ].join('\n');

    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (firstIncomplete !== null) return null;

  return (
    <Shell currentStep={null}>
      <section className="context-header">
        <h1>Proof Submission</h1>
        <p>All 8 steps complete. Add links and copy final submission.</p>
      </section>
      <div className="workspace">
        <main className="workspace-main">
          <h2>8 Step Status</h2>
          <div className="proof-list">
            {STEPS.map((step) => (
              <div className="proof-item" key={step.number}>
                <span>{step.number}. {step.title}</span>
                <strong>{artifacts[step.number]?.uploadedAt ? 'Done' : 'Pending'}</strong>
              </div>
            ))}
          </div>
        </main>
        <aside className="workspace-side">
          <h3>Submission Links</h3>
          <label className="label" htmlFor="lovable-link">Lovable Link</label>
          <input
            id="lovable-link"
            className="input"
            value={links.lovable}
            onChange={(event) => handleLinkChange('lovable', event.target.value)}
          />
          <label className="label" htmlFor="github-link">GitHub Link</label>
          <input
            id="github-link"
            className="input"
            value={links.github}
            onChange={(event) => handleLinkChange('github', event.target.value)}
          />
          <label className="label" htmlFor="deploy-link">Deploy Link</label>
          <input
            id="deploy-link"
            className="input"
            value={links.deploy}
            onChange={(event) => handleLinkChange('deploy', event.target.value)}
          />
          <button type="button" className="button button-accent" onClick={handleCopySubmission}>
            {copied ? 'Copied' : 'Copy Final Submission'}
          </button>
        </aside>
      </div>
    </Shell>
  );
}

function ProductNav() {
  return (
    <nav className="product-nav">
      {NAV_ITEMS.map((item) => (
        <Link key={item.to} className="button" to={item.to}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

type TemplateTabsProps = {
  template: ResumeTemplate;
  onChange: (template: ResumeTemplate) => void;
};

type AccentPickerProps = {
  selected: AccentTheme;
  onChange: (theme: AccentTheme) => void;
};

type ResumePreviewProps = {
  draft: ResumeDraft;
  template: ResumeTemplate;
  accentColor: string;
  className?: string;
};

function TemplateTabs({ template, onChange }: TemplateTabsProps) {
  const renderSketch = (option: ResumeTemplate) => {
    if (option === 'Modern') {
      return (
        <div className="template-sketch template-sketch-modern">
          <div />
          <div>
            <span />
            <span />
            <span />
          </div>
        </div>
      );
    }
    if (option === 'Minimal') {
      return (
        <div className="template-sketch template-sketch-minimal">
          <span />
          <span />
          <span />
        </div>
      );
    }
    return (
      <div className="template-sketch template-sketch-classic">
        <span />
        <hr />
        <span />
      </div>
    );
  };

  return (
    <div className="template-tabs" aria-label="Resume Templates">
      {TEMPLATE_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={`template-thumb ${template === option ? 'template-thumb-active' : ''}`}
          onClick={() => onChange(option)}
        >
          {template === option ? <span className="template-check">✓</span> : null}
          <div className="template-thumb__label">{option}</div>
          {renderSketch(option)}
        </button>
      ))}
    </div>
  );
}

function ColorThemePicker({ selected, onChange }: AccentPickerProps) {
  return (
    <div className="color-picker" aria-label="Color Themes">
      {ACCENT_THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          className={`color-dot ${selected.id === theme.id ? 'color-dot-active' : ''}`}
          style={{ background: theme.color }}
          onClick={() => onChange(theme)}
          title={theme.label}
          aria-label={theme.label}
        />
      ))}
    </div>
  );
}

function AtsScoreCircle({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  let toneClass = 'ats-red';
  let label = 'Needs Work';
  if (score >= 71) {
    toneClass = 'ats-green';
    label = 'Strong Resume';
  } else if (score >= 41) {
    toneClass = 'ats-amber';
    label = 'Getting There';
  }

  return (
    <div className={`ats-circle-card ${toneClass}`}>
      <svg className="ats-circle" viewBox="0 0 120 120" aria-label="ATS Score">
        <circle className="ats-circle-track" cx="60" cy="60" r="45" />
        <circle
          className="ats-circle-progress"
          cx="60"
          cy="60"
          r="45"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ats-circle-center">
        <strong>{score}</strong>
        <span>/ 100</span>
        <p>{label}</p>
      </div>
    </div>
  );
}

function ResumePreviewDocument({ draft, template, accentColor, className = '' }: ResumePreviewProps) {
  const previewEducation = nonEmptyEducation(draft);
  const previewExperience = nonEmptyExperience(draft);
  const previewProjects = nonEmptyProjects(draft);
  const previewSkills = skillItems(draft);
  const contactLine = [draft.email, draft.phone, draft.location].map((item) => item.trim()).filter(Boolean).join(' | ');
  const style = { '--resume-accent': accentColor } as CSSProperties;

  const sectionSummary = draft.summary.trim() ? (
    <section className="preview-section">
      <h3>Summary</h3>
      <p>{draft.summary.trim()}</p>
    </section>
  ) : null;

  const sectionEducation = previewEducation.length ? (
    <section className="preview-section">
      <h3>Education</h3>
      {previewEducation.map((entry) => (
        <p className="print-avoid-break" key={entry.id}>{[entry.school, entry.degree, entry.year].filter((item) => item.trim()).join(' | ')}</p>
      ))}
    </section>
  ) : null;

  const sectionExperience = previewExperience.length ? (
    <section className="preview-section">
      <h3>Experience</h3>
      {previewExperience.map((entry) => (
        <div className="print-avoid-break project-preview-card" key={entry.id}>
          <p>{[entry.company, entry.role, entry.duration].filter((item) => item.trim()).join(' | ')}</p>
          {entry.bullet.trim() ? <p>{entry.bullet.trim()}</p> : null}
        </div>
      ))}
    </section>
  ) : null;

  const sectionProjects = previewProjects.length ? (
    <section className="preview-section">
      <h3>Projects</h3>
      {previewProjects.map((entry) => (
        <div className="print-avoid-break project-preview-card" key={entry.id}>
          {entry.title.trim() ? <p>{entry.title.trim()}</p> : null}
          {entry.description.trim() ? <p>{entry.description.trim()}</p> : null}
          {entry.techStack.length ? (
            <div className="chip-wrap">
              {entry.techStack.map((tech) => <span className="chip chip-static" key={`${entry.id}-${tech}`}>{tech}</span>)}
            </div>
          ) : null}
          {(entry.liveUrl.trim() || entry.githubUrl.trim()) ? (
            <div className="project-links">
              {entry.liveUrl.trim() ? <a href={entry.liveUrl.trim()} target="_blank" rel="noreferrer">[Live]</a> : null}
              {entry.githubUrl.trim() ? <a href={entry.githubUrl.trim()} target="_blank" rel="noreferrer">[GitHub]</a> : null}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  ) : null;

  const sectionSkills = previewSkills.length ? (
    <section className="preview-section">
      <h3>Skills</h3>
      {draft.technicalSkills.length ? (
        <div className="preview-section">
          <p>Technical Skills</p>
          <div className="chip-wrap">
            {draft.technicalSkills.map((skill) => <span className="chip chip-static" key={`tech-${skill}`}>{skill}</span>)}
          </div>
        </div>
      ) : null}
      {draft.softSkills.length ? (
        <div className="preview-section">
          <p>Soft Skills</p>
          <div className="chip-wrap">
            {draft.softSkills.map((skill) => <span className="chip chip-static" key={`soft-${skill}`}>{skill}</span>)}
          </div>
        </div>
      ) : null}
      {draft.toolsTechnologies.length ? (
        <div className="preview-section">
          <p>Tools & Technologies</p>
          <div className="chip-wrap">
            {draft.toolsTechnologies.map((skill) => <span className="chip chip-static" key={`tool-${skill}`}>{skill}</span>)}
          </div>
        </div>
      ) : null}
    </section>
  ) : null;

  const sectionLinks = (draft.github.trim() || draft.linkedin.trim()) ? (
    <section className="preview-section">
      <h3>Links</h3>
      {draft.github.trim() ? <p>{draft.github.trim()}</p> : null}
      {draft.linkedin.trim() ? <p>{draft.linkedin.trim()}</p> : null}
    </section>
  ) : null;

  if (template === 'Modern') {
    return (
      <div className={`resume-preview-shell template-modern ${className}`} style={style}>
        <aside className="resume-sidebar">
          {draft.name.trim() ? <h2>{draft.name.trim()}</h2> : null}
          {contactLine ? <p>{contactLine}</p> : null}
          {sectionSkills}
          {sectionLinks}
        </aside>
        <main className="resume-main">
          {sectionSummary}
          {sectionExperience}
          {sectionProjects}
          {sectionEducation}
        </main>
      </div>
    );
  }

  return (
    <div className={`resume-preview-shell ${toTemplateClass(template)} ${className}`} style={style}>
      {(draft.name.trim() || contactLine) && (
        <section className="preview-section">
          {draft.name.trim() ? <h2>{draft.name.trim()}</h2> : null}
          {contactLine ? <p>{contactLine}</p> : null}
        </section>
      )}
      {sectionSummary}
      {sectionEducation}
      {sectionExperience}
      {sectionProjects}
      {sectionSkills}
      {sectionLinks}
    </div>
  );
}

function HomePage() {
  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__left">AI Resume Builder</div>
        <div className="top-bar__center">Problem Statement + Builder Skeleton</div>
        <span className="status-badge">In Progress</span>
      </header>
      <ProductNav />
      <section className="context-header">
        <h1>Build a Resume That Gets Read.</h1>
        <p>Structure-first resume builder focused on clarity, measurable impact, and ATS compatibility.</p>
        <div>
          <Link className="button button-accent" to="/builder">
            Start Building
          </Link>
        </div>
      </section>
    </div>
  );
}

function BuilderPage() {
  const [draft, setDraft] = useState<ResumeDraft>(() => readResumeDraft());
  const [template, setTemplate] = useState<ResumeTemplate>(() => readTemplateChoice());
  const [accentTheme, setAccentTheme] = useState<AccentTheme>(() => readAccentChoice());
  const [technicalSkillInput, setTechnicalSkillInput] = useState('');
  const [softSkillInput, setSoftSkillInput] = useState('');
  const [toolsInput, setToolsInput] = useState('');
  const [isSuggestingSkills, setIsSuggestingSkills] = useState(false);
  const [projectTechInput, setProjectTechInput] = useState<Record<string, string>>({});
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const ats = useMemo(() => computeAtsResult(draft), [draft]);
  const topImprovements = useMemo(() => computeTopImprovements(draft), [draft]);

  useEffect(() => {
    localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, template);
  }, [template]);

  useEffect(() => {
    localStorage.setItem(ACCENT_STORAGE_KEY, accentTheme.id);
  }, [accentTheme]);

  const updateEducation = (id: string, field: keyof Omit<EducationEntry, 'id'>, value: string) => {
    setDraft((prev) => ({
      ...prev,
      education: prev.education.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
    }));
  };

  const updateExperience = (id: string, field: keyof Omit<ExperienceEntry, 'id'>, value: string) => {
    setDraft((prev) => ({
      ...prev,
      experience: prev.experience.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
    }));
  };

  const updateProject = (id: string, field: 'title' | 'description' | 'liveUrl' | 'githubUrl', value: string) => {
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
    }));
  };

  const loadSampleData = () => {
    setDraft({
      name: 'Shreenivas Nayakawadi',
      email: 'shreenivas@example.com',
      phone: '+91-90000-00000',
      location: 'Bengaluru, India',
      summary: 'Frontend engineer focused on clean, measurable product UX.',
      education: [
        { id: crypto.randomUUID(), school: 'KodNest Academy', degree: 'B.Tech CSE', year: '2026' },
      ],
      experience: [
        {
          id: crypto.randomUUID(),
          company: 'Acme Labs',
          role: 'Frontend Intern',
          duration: '2025',
          bullet: 'Improved dashboard load speed by 32% for 500+ daily users.',
        },
      ],
      projects: [
        {
          id: crypto.randomUUID(),
          title: 'Placement Platform',
          description: 'Built modular prep workflow UI and reduced task completion time by 28%.',
          techStack: ['React', 'TypeScript', 'Node.js'],
          liveUrl: 'https://example.com/placement-platform',
          githubUrl: 'https://github.com/shreenivas-nayakawadi/placement-platform',
        },
        {
          id: crypto.randomUUID(),
          title: 'Resume Analyzer',
          description: 'Implemented deterministic checks that lifted profile completeness to 90%.',
          techStack: ['TypeScript', 'GraphQL', 'PostgreSQL'],
          liveUrl: '',
          githubUrl: 'https://github.com/shreenivas-nayakawadi/resume-analyzer',
        },
      ],
      technicalSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'GraphQL'],
      softSkills: ['Team Leadership', 'Problem Solving'],
      toolsTechnologies: ['Git', 'Docker', 'AWS'],
      github: 'https://github.com/shreenivas-nayakawadi',
      linkedin: 'https://linkedin.com/in/shreenivas',
    });
  };

  const addUniqueChip = (existing: string[], value: string) => {
    const normalized = value.trim();
    if (!normalized) return existing;
    if (existing.some((item) => item.toLowerCase() === normalized.toLowerCase())) return existing;
    return [...existing, normalized];
  };

  const removeChip = (existing: string[], value: string) =>
    existing.filter((item) => item.toLowerCase() !== value.toLowerCase());

  const addSkillChip = (category: 'technicalSkills' | 'softSkills' | 'toolsTechnologies', rawValue: string) => {
    setDraft((prev) => ({ ...prev, [category]: addUniqueChip(prev[category], rawValue) }));
  };

  const suggestSkills = () => {
    setIsSuggestingSkills(true);
    window.setTimeout(() => {
      setDraft((prev) => ({
        ...prev,
        technicalSkills: TECHNICAL_SUGGESTIONS.reduce((list, skill) => addUniqueChip(list, skill), prev.technicalSkills),
        softSkills: SOFT_SUGGESTIONS.reduce((list, skill) => addUniqueChip(list, skill), prev.softSkills),
        toolsTechnologies: TOOLS_SUGGESTIONS.reduce((list, skill) => addUniqueChip(list, skill), prev.toolsTechnologies),
      }));
      setIsSuggestingSkills(false);
    }, 1000);
  };

  const addProjectTechChip = (projectId: string, rawValue: string) => {
    const normalized = rawValue.trim();
    if (!normalized) return;
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.map((entry) =>
        entry.id === projectId ? { ...entry, techStack: addUniqueChip(entry.techStack, normalized) } : entry,
      ),
    }));
  };

  const removeProjectTechChip = (projectId: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.map((entry) =>
        entry.id === projectId ? { ...entry, techStack: removeChip(entry.techStack, value) } : entry,
      ),
    }));
  };

  const addProject = () => {
    const newProject = createProjectEntry();
    setDraft((prev) => ({ ...prev, projects: [...prev.projects, newProject] }));
    setOpenProjectId(newProject.id);
  };

  const deleteProject = (projectId: string) => {
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.length > 1 ? prev.projects.filter((entry) => entry.id !== projectId) : [createProjectEntry()],
    }));
    setProjectTechInput((prev) => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
    if (openProjectId === projectId) setOpenProjectId(null);
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__left">AI Resume Builder</div>
        <div className="top-bar__center">Builder</div>
        <span className="status-badge">In Progress</span>
      </header>
      <ProductNav />
      <section className="workspace">
        <main className="workspace-main">
          <h2>Builder</h2>
          <button type="button" className="button button-accent" onClick={loadSampleData}>
            Load Sample Data
          </button>

          <h3>Personal Info</h3>
          <input className="input" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="input" placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <input className="input" placeholder="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          <input className="input" placeholder="Location" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />

          <h3>Summary</h3>
          <textarea className="textarea" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />

          <h3>Education</h3>
          {draft.education.map((entry) => (
            <div key={entry.id} className="entry-card">
              <input className="input" placeholder="School" value={entry.school} onChange={(e) => updateEducation(entry.id, 'school', e.target.value)} />
              <input className="input" placeholder="Degree" value={entry.degree} onChange={(e) => updateEducation(entry.id, 'degree', e.target.value)} />
              <input className="input" placeholder="Year" value={entry.year} onChange={(e) => updateEducation(entry.id, 'year', e.target.value)} />
            </div>
          ))}
          <button
            type="button"
            className="button"
            onClick={() => setDraft((prev) => ({ ...prev, education: [...prev.education, createEducationEntry()] }))}
          >
            Add Education
          </button>

          <h3>Experience</h3>
          {draft.experience.map((entry) => (
            <div key={entry.id} className="entry-card">
              <input className="input" placeholder="Company" value={entry.company} onChange={(e) => updateExperience(entry.id, 'company', e.target.value)} />
              <input className="input" placeholder="Role" value={entry.role} onChange={(e) => updateExperience(entry.id, 'role', e.target.value)} />
              <input className="input" placeholder="Duration" value={entry.duration} onChange={(e) => updateExperience(entry.id, 'duration', e.target.value)} />
              <textarea className="textarea" placeholder="Impact bullet" value={entry.bullet} onChange={(e) => updateExperience(entry.id, 'bullet', e.target.value)} />
              {getBulletGuidance(entry.bullet).map((hint) => (
                <p key={`${entry.id}-${hint}`} className="inline-guidance">{hint}</p>
              ))}
            </div>
          ))}
          <button
            type="button"
            className="button"
            onClick={() => setDraft((prev) => ({ ...prev, experience: [...prev.experience, createExperienceEntry()] }))}
          >
            Add Experience
          </button>

          <h3>Skills</h3>
          <button type="button" className="button" onClick={suggestSkills} disabled={isSuggestingSkills}>
            {isSuggestingSkills ? 'Suggesting...' : '✨ Suggest Skills'}
          </button>

          <div className="entry-card">
            <h3>Technical Skills ({draft.technicalSkills.length})</h3>
            <input
              className="input"
              placeholder="Type skill and press Enter"
              value={technicalSkillInput}
              onChange={(e) => setTechnicalSkillInput(e.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                addSkillChip('technicalSkills', technicalSkillInput);
                setTechnicalSkillInput('');
              }}
            />
            <div className="chip-wrap">
              {draft.technicalSkills.map((skill) => (
                <button key={skill} type="button" className="chip" onClick={() => setDraft((prev) => ({ ...prev, technicalSkills: removeChip(prev.technicalSkills, skill) }))}>
                  {skill} x
                </button>
              ))}
            </div>
          </div>

          <div className="entry-card">
            <h3>Soft Skills ({draft.softSkills.length})</h3>
            <input
              className="input"
              placeholder="Type skill and press Enter"
              value={softSkillInput}
              onChange={(e) => setSoftSkillInput(e.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                addSkillChip('softSkills', softSkillInput);
                setSoftSkillInput('');
              }}
            />
            <div className="chip-wrap">
              {draft.softSkills.map((skill) => (
                <button key={skill} type="button" className="chip" onClick={() => setDraft((prev) => ({ ...prev, softSkills: removeChip(prev.softSkills, skill) }))}>
                  {skill} x
                </button>
              ))}
            </div>
          </div>

          <div className="entry-card">
            <h3>Tools & Technologies ({draft.toolsTechnologies.length})</h3>
            <input
              className="input"
              placeholder="Type tool and press Enter"
              value={toolsInput}
              onChange={(e) => setToolsInput(e.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                addSkillChip('toolsTechnologies', toolsInput);
                setToolsInput('');
              }}
            />
            <div className="chip-wrap">
              {draft.toolsTechnologies.map((skill) => (
                <button key={skill} type="button" className="chip" onClick={() => setDraft((prev) => ({ ...prev, toolsTechnologies: removeChip(prev.toolsTechnologies, skill) }))}>
                  {skill} x
                </button>
              ))}
            </div>
          </div>

          <h3>Projects</h3>
          <button type="button" className="button" onClick={addProject}>Add Project</button>
          {draft.projects.map((entry, index) => {
            const isOpen = openProjectId === entry.id || (openProjectId === null && index === 0);
            return (
              <div key={entry.id} className="entry-card">
                <div className="project-header-row">
                  <button type="button" className="button" onClick={() => setOpenProjectId(isOpen ? null : entry.id)}>
                    {entry.title.trim() || `Project ${index + 1}`}
                  </button>
                  <button type="button" className="button" onClick={() => deleteProject(entry.id)}>
                    Delete
                  </button>
                </div>
                {isOpen ? (
                  <>
                    <input className="input" placeholder="Project Title" value={entry.title} onChange={(e) => updateProject(entry.id, 'title', e.target.value)} />
                    <textarea
                      className="textarea"
                      placeholder="Description"
                      maxLength={200}
                      value={entry.description}
                      onChange={(e) => updateProject(entry.id, 'description', e.target.value)}
                    />
                    <p className="inline-guidance">{entry.description.length}/200</p>
                    {getBulletGuidance(entry.description).map((hint) => (
                      <p key={`${entry.id}-${hint}`} className="inline-guidance">{hint}</p>
                    ))}
                    <input
                      className="input"
                      placeholder="Add tech and press Enter"
                      value={projectTechInput[entry.id] ?? ''}
                      onChange={(e) => setProjectTechInput((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;
                        event.preventDefault();
                        addProjectTechChip(entry.id, projectTechInput[entry.id] ?? '');
                        setProjectTechInput((prev) => ({ ...prev, [entry.id]: '' }));
                      }}
                    />
                    <div className="chip-wrap">
                      {entry.techStack.map((tech) => (
                        <button key={`${entry.id}-${tech}`} type="button" className="chip" onClick={() => removeProjectTechChip(entry.id, tech)}>
                          {tech} x
                        </button>
                      ))}
                    </div>
                    <input className="input" placeholder="Live URL (optional)" value={entry.liveUrl} onChange={(e) => updateProject(entry.id, 'liveUrl', e.target.value)} />
                    <input className="input" placeholder="GitHub URL (optional)" value={entry.githubUrl} onChange={(e) => updateProject(entry.id, 'githubUrl', e.target.value)} />
                  </>
                ) : null}
              </div>
            );
          })}

          <h3>Links</h3>
          <input className="input" placeholder="GitHub" value={draft.github} onChange={(e) => setDraft({ ...draft, github: e.target.value })} />
          <input className="input" placeholder="LinkedIn" value={draft.linkedin} onChange={(e) => setDraft({ ...draft, linkedin: e.target.value })} />
        </main>
        <aside className="workspace-side">
          <h3>Templates</h3>
          <TemplateTabs template={template} onChange={setTemplate} />
          <ColorThemePicker selected={accentTheme} onChange={setAccentTheme} />
          <h3>ATS Readiness Score</h3>
          <div className="score-card">
            <div className="score-row">
              <strong>{ats.score}</strong>
              <span>/ 100</span>
            </div>
            <div className="score-meter" aria-label="ATS Readiness Score">
              <div className="score-meter__fill" style={{ width: `${ats.score}%` }} />
            </div>
            <div className="suggestions">
              {ats.suggestions.length === 0 ? (
                <p>Strong foundation. Keep refining clarity and impact.</p>
              ) : (
                ats.suggestions.map((suggestion) => <p key={suggestion}>{suggestion}</p>)
              )}
            </div>
            <h3>Top 3 Improvements</h3>
            <div className="suggestions">
              {topImprovements.length === 0 ? (
                <p>No critical improvements pending.</p>
              ) : (
                topImprovements.map((item) => <p key={item}>{item}</p>)
              )}
            </div>
          </div>
          <h3>Live Preview</h3>
          <ResumePreviewDocument draft={draft} template={template} accentColor={accentTheme.color} />
        </aside>
      </section>
    </div>
  );
}

function CleanPreviewPage() {
  const [draft, setDraft] = useState<ResumeDraft>(() => readResumeDraft());
  const [template, setTemplate] = useState<ResumeTemplate>(() => readTemplateChoice());
  const [accentTheme, setAccentTheme] = useState<AccentTheme>(() => readAccentChoice());
  const [warning, setWarning] = useState('');
  const [copyState, setCopyState] = useState('');
  const [pdfToast, setPdfToast] = useState('');
  const ats = useMemo(() => computeAtsResult(draft), [draft]);

  useEffect(() => {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, template);
  }, [template]);

  useEffect(() => {
    localStorage.setItem(ACCENT_STORAGE_KEY, accentTheme.id);
  }, [accentTheme]);

  useEffect(() => {
    const reloadDraft = () => setDraft(readResumeDraft());
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === RESUME_STORAGE_KEY) reloadDraft();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', reloadDraft);
    document.addEventListener('visibilitychange', reloadDraft);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', reloadDraft);
      document.removeEventListener('visibilitychange', reloadDraft);
    };
  }, []);

  const checkAndWarn = () => {
    if (shouldWarnIncomplete(draft)) {
      setWarning('Your resume may look incomplete.');
    } else {
      setWarning('');
    }
  };

  const handlePrint = () => {
    checkAndWarn();
    window.print();
  };

  const handleCopyText = async () => {
    checkAndWarn();
    await navigator.clipboard.writeText(toPlainTextResume(draft));
    setCopyState('Resume text copied');
    setTimeout(() => setCopyState(''), 1500);
  };

  const handleDownloadPdf = () => {
    checkAndWarn();
    setPdfToast('PDF export ready! Check your downloads.');
    setTimeout(() => setPdfToast(''), 1500);
  };

  return (
    <div className="app-shell preview-shell">
      <header className="top-bar">
        <div className="top-bar__left">AI Resume Builder</div>
        <div className="top-bar__center">Preview</div>
        <span className="status-badge preview-badge">Ready</span>
      </header>
      <ProductNav />
      <TemplateTabs template={template} onChange={setTemplate} />
      <ColorThemePicker selected={accentTheme} onChange={setAccentTheme} />
      <div className="preview-actions no-print">
        <button type="button" className="button" onClick={handleDownloadPdf}>
          Download PDF
        </button>
        <button type="button" className="button" onClick={handlePrint}>
          Print / Save as PDF
        </button>
        <button type="button" className="button" onClick={handleCopyText}>
          Copy Resume as Text
        </button>
      </div>
      <div className="ats-preview-panel no-print">
        <h3>ATS Resume Score</h3>
        <AtsScoreCircle score={ats.score} />
        <div className="suggestions">
          {ats.suggestions.length ? (
            ats.suggestions.map((item) => <p key={item}>{item}</p>)
          ) : (
            <p>Great work. Your resume is well balanced.</p>
          )}
        </div>
      </div>
      {(warning || copyState || pdfToast) ? (
        <div className="preview-feedback no-print">
          {warning ? <p>{warning}</p> : null}
          {copyState ? <p>{copyState}</p> : null}
          {pdfToast ? <p>{pdfToast}</p> : null}
        </div>
      ) : null}
      <ResumePreviewDocument
        draft={draft}
        template={template}
        accentColor={accentTheme.color}
        className="preview-paper"
      />
    </div>
  );
}

function AppProofPage() {
  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__left">AI Resume Builder</div>
        <div className="top-bar__center">Proof</div>
        <span className="status-badge">In Progress</span>
      </header>
      <ProductNav />
      <section className="context-header">
        <h1>Proof Artifacts</h1>
        <p>Placeholder for artifacts.</p>
        <input className="input" placeholder="Lovable preview link" />
        <input className="input" placeholder="GitHub repository link" />
        <input className="input" placeholder="Deployment link" />
      </section>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/builder" element={<BuilderPage />} />
        <Route path="/preview" element={<CleanPreviewPage />} />
        <Route path="/proof" element={<AppProofPage />} />
        <Route path="/rb/proof" element={<ProofPage />} />
        <Route path="/rb/:stepSlug" element={<StepPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
