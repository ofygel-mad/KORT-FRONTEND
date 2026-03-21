import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Mail, Phone, User } from 'lucide-react';
import { api } from '../../shared/api/client';
import { PageLoader } from '../../shared/ui/PageLoader';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';
import { useUIStore } from '../../shared/stores/ui';
import { Button } from '../../shared/ui/Button';
import styles from './Customers.module.css';

interface CustomerListItem {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  company_name: string;
  status: string;
}

interface CustomerListResponse {
  count: number;
  results: CustomerListItem[];
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const openCreateCustomer = useUIStore((state) => state.openCreateCustomer);

  useDocumentTitle('Клиенты');

  const { data, isLoading } = useQuery<CustomerListResponse>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers/'),
  });

  if (isLoading) {
    return <PageLoader />;
  }

  const customers = data?.results ?? [];
  const total = data?.count ?? customers.length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Клиенты"
        subtitle={
          total > 0
            ? `В базе ${total} клиентов — все карточки и контактные точки уже собраны в одном списке.`
            : 'Соберите первую базу клиентов и превратите входящий поток в рабочий контур.'
        }
        actions={<Button onClick={openCreateCustomer}>Добавить клиента</Button>}
      />

      {customers.length === 0 ? (
        <EmptyState
          icon={<User size={40} />}
          title="Нет клиентов"
          description="Добавьте первого клиента вручную или начните с импорта существующей базы."
          action={{ label: 'Добавить клиента', onClick: openCreateCustomer }}
        />
      ) : (
        <div className={styles.list}>
          {customers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className={styles.card}
              onClick={() => navigate(`/customers/${customer.id}`)}
            >
              <div className={styles.avatar}>
                <User size={16} />
              </div>

              <div className={styles.cardBody}>
                <div className={styles.cardHead}>
                  <div className={styles.nameBlock}>
                    <div className={styles.name}>{customer.full_name}</div>
                    {customer.company_name && (
                      <div className={styles.company}>
                        <Building2 size={12} />
                        {customer.company_name}
                      </div>
                    )}
                  </div>
                  {customer.status && <span className={styles.status}>{customer.status}</span>}
                </div>

                <div className={styles.meta}>
                  {customer.phone && (
                    <span className={styles.metaItem}>
                      <Phone size={13} />
                      {customer.phone}
                    </span>
                  )}
                  {customer.email && (
                    <span className={styles.metaItem}>
                      <Mail size={13} />
                      {customer.email}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
