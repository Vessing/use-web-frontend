import { navigateTo } from '../../app/browserRouter';
import type { DocRoute } from '../../app/navigation';

export interface DocNavItem {
  label: string;
  route: DocRoute;
  children?: DocNavItem[];
}

export const docNavItems: DocNavItem[] = [
  {
    label: 'Overview',
    route: 'introduction',
  },
  {
    label: 'Workflow',
    route: 'workflow',
  },
  {
    label: 'Imports',
    route: 'imports',
  },
  {
    label: 'Enumerations',
    route: 'enumerations',
  },
  {
    label: 'Datatypes',
    route: 'datatypes',
  },
  {
    label: 'Class Diagram',
    route: 'class-diagram',
    children: [
      {
        label: 'Properties',
        route: 'class-diagram/properties',
        children: [
          { label: 'Details', route: 'class-diagram/properties/details' },
          { label: 'Attributes', route: 'class-diagram/properties/attributes' },
          { label: 'Operations', route: 'class-diagram/properties/operations' },
          { label: 'Generalizations', route: 'class-diagram/properties/generalizations' },
          { label: 'Definitions', route: 'class-diagram/properties/definitions' },
        ],
      },
      { label: 'Associations', route: 'class-diagram/associations' },
      { label: 'Invariants', route: 'class-diagram/invariants' },
    ],
  },
  {
    label: 'Object Diagram',
    route: 'object-diagram',
    children: [
      { label: 'Objects', route: 'object-diagram/objects' },
      { label: 'Object Links', route: 'object-diagram/object-links' },
      { label: 'Operation Invocation', route: 'object-diagram/operation-invocation' },
    ],
  },
];

interface DocSidebarProps {
  activeRoute: DocRoute;
}

function isItemActive(item: DocNavItem, activeRoute: DocRoute): boolean {
  if (item.route === activeRoute) return true;
  if (item.children) {
    return item.children.some((child) => isItemActive(child, activeRoute));
  }
  return false;
}

export function DocSidebar({ activeRoute }: DocSidebarProps) {
  return (
    <nav className="doc-sidebar" aria-label="Documentation navigation">
      <ul className="doc-sidebar-list" role="list">
        {docNavItems.map((item) => {
          const isParentActive = isItemActive(item, activeRoute);

          return (
            <li key={item.route}>
              <a
                href={`/docs/${item.route}`}
                className={`doc-sidebar-item${isParentActive && item.route === activeRoute ? ' doc-sidebar-item--active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo(`/docs/${item.route}`);
                }}
              >
                {item.label}
              </a>
              {item.children && item.children.length > 0 && (
                <ul className="doc-sidebar-sub-list" role="list">
                  {item.children.map((child) => {
                    const isChildActive = isItemActive(child, activeRoute);
                    return (
                      <li key={child.route}>
                        <a
                          href={`/docs/${child.route}`}
                          className={`doc-sidebar-item doc-sidebar-item--nested${isChildActive && child.route === activeRoute ? ' doc-sidebar-item--active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigateTo(`/docs/${child.route}`);
                          }}
                        >
                          {child.label}
                        </a>
                        {child.children && child.children.length > 0 && (
                          <ul className="doc-sidebar-sub-list" role="list">
                            {child.children.map((subChild) => (
                              <li key={subChild.route}>
                                <a
                                  href={`/docs/${subChild.route}`}
                                  className={`doc-sidebar-item doc-sidebar-item--nested-2${activeRoute === subChild.route ? ' doc-sidebar-item--active' : ''}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigateTo(`/docs/${subChild.route}`);
                                  }}
                                >
                                  {subChild.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
