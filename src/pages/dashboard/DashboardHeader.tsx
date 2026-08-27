import { AppBrand } from '../../components/AppBrand';

export function DashboardHeader() {
  return (
    <header className="dashboard-header">
      <AppBrand />
      <button type="button" className="user-avatar" aria-label="Open user menu">
        U
      </button>
    </header>
  );
}
