import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import setHoundLogo from '@/assets/set-hound-logo.png';

export default function DemoVenue() {
  const { signIn, setActiveRole } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const { error } = await signIn('examplevenue@gmail.com', 'examplevenue!');
      if (error) { navigate('/?auth=login', { replace: true }); return; }
      setActiveRole('venue');
      navigate('/venue', { replace: true });
    })();
  }, [signIn, setActiveRole, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <img src={setHoundLogo} alt="Set Hound" className="h-10 w-auto animate-pulse" />
    </div>
  );
}
