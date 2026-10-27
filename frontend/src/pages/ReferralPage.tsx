import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { Alert, Card } from '../components/ui';
import type { ReferralState } from '../types/api';
import '../styles/survey.css';

export default function ReferralPage() {
  const state = useLocation().state as ReferralState | null;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const incomplete = state?.riskLevel === 'unassessable';

  useEffect(() => headingRef.current?.focus(), []);

  return (
    <div className="referral stack">
      <Card>
        <div className="stack">
          <span className="referral-icon" aria-hidden="true">
            {incomplete ? '📝' : '🩺'}
          </span>
          <h1 ref={headingRef} tabIndex={-1} className="mb-0">
            {incomplete ? 'Biraz daha bilgiye ihtiyacımız var' : 'Önce bir uzman değerlendirmesi öneriyoruz'}
          </h1>
          <p className="mb-0">
            {incomplete
              ? 'Size güvenli bir plan hazırlayabilmemiz için sağlık anketindeki bazı bilgiler eksik. Anketi tamamladıktan sonra tekrar deneyebilirsiniz.'
              : 'Verdiğiniz bilgilere göre şu an sizin için bir egzersiz planı oluşturmadık. Bu bir tanı değildir; yalnızca güvenliğiniz için alınan bir önlemdir.'}
          </p>

          {state?.reasons?.length ? (
            <Alert tone={incomplete ? 'info' : 'warning'} title={incomplete ? 'Eksik bilgiler' : 'Bu kararın nedenleri'}>
              <ul>
                {state.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {!incomplete && (
            <div className="stack-sm">
              <h2 className="mb-0">Ne yapmalısınız?</h2>
              <ul className="referral-steps">
                <li>Bir fizyoterapiste veya hekime başvurarak şikâyetinizi değerlendirtin.</li>
                <li>Uzman onay verene kadar ağrınızı artıran hareketlerden kaçının.</li>
                <li>Durumunuz değişirse sağlık anketini güncelleyip yeniden deneyebilirsiniz.</li>
              </ul>
              <Alert tone="danger" title="Acil belirtiler">
                Ani güç kaybı, idrar/dışkı kontrolünde kayıp, göğüs ağrısı veya nefes darlığı gibi belirtilerde vakit
                kaybetmeden <strong>112</strong>’yi arayın.
              </Alert>
            </div>
          )}

          <div className="row">
            <Link to="/anket" className="btn btn-primary">
              {incomplete ? 'Anketi tamamla' : 'Anketi güncelle'}
            </Link>
            <Link to="/" className="btn btn-secondary">
              Ana sayfa
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
