import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/rb/01-problem" replace />} />
        <Route path="/rb/:stepSlug" element={<StepPage />} />
        <Route path="/rb/proof" element={<ProofPage />} />
        <Route path="*" element={<Navigate to="/rb/01-problem" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
