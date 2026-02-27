import { useNavigate } from 'react-router-dom';
import UpgradeModal from '../components/subscription/UpgradeModal';

export default function FluxoAssinaturaDemo() {
  const navigate = useNavigate();

  return (
    <UpgradeModal
      open={true}
      onClose={() => navigate(-1)}
      source="sono_protocol"
    />
  );
}
