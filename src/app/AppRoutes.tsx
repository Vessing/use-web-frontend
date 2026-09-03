import { useCurrentPath } from './browserRouter';
import { matchRoute } from './navigation';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { WorkspaceLayout } from '../pages/workspace/WorkspaceLayout';
import { IntroductionPage } from '../pages/documentation/IntroductionPage';
import { WorkflowPage } from '../pages/documentation/WorkflowPage';
import { ImportsPage } from '../pages/documentation/ImportsPage';
import { EnumerationsPage } from '../pages/documentation/EnumerationsPage';
import { DatatypesPage } from '../pages/documentation/DatatypesPage';
import { ClassDiagramPage } from '../pages/documentation/ClassDiagramPage';
import { ClassPropertiesPage } from '../pages/documentation/ClassPropertiesPage';
import { ClassDetailsPage } from '../pages/documentation/ClassDetailsPage';
import { ClassAttributesPage } from '../pages/documentation/ClassAttributesPage';
import { ClassOperationsPage } from '../pages/documentation/ClassOperationsPage';
import { ClassGeneralizationsPage } from '../pages/documentation/ClassGeneralizationsPage';
import { ClassDefinitionsPage } from '../pages/documentation/ClassDefinitionsPage';
import { AssociationsPage } from '../pages/documentation/AssociationsPage';
import { InvariantsPage } from '../pages/documentation/InvariantsPage';
import { ObjectDiagramPage } from '../pages/documentation/ObjectDiagramPage';
import { ObjectsPage } from '../pages/documentation/ObjectsPage';
import { ObjectLinksPage } from '../pages/documentation/ObjectLinksPage';
import { OperationInvocationPage } from '../pages/documentation/OperationInvocationPage';
import { DocPlaceholderPage } from '../pages/documentation/DocPlaceholderPage';

const docPageTitles: Record<string, string> = {
  workflow: 'Workflow',
  imports: 'Imports',
  enumerations: 'Enumerations',
  datatypes: 'Datatypes',
  'class-diagram': 'Class Diagram',
  'class-diagram/properties': 'Class Properties',
  'class-diagram/properties/details': 'Class Properties: Details',
  'class-diagram/properties/attributes': 'Class Properties: Attributes',
  'class-diagram/properties/operations': 'Class Properties: Operations',
  'class-diagram/properties/generalizations': 'Class Properties: Generalizations',
  'class-diagram/properties/definitions': 'Class Properties: Definitions',
  'class-diagram/associations': 'Associations',
  'class-diagram/invariants': 'Invariants',
  'object-diagram': 'Object Diagram',
  'object-diagram/objects': 'Objects',
  'object-diagram/object-links': 'Object Links',
  'object-diagram/operation-invocation': 'Operation Invocation',
};

export function AppRoutes() {
  const route = matchRoute(useCurrentPath());

  if (route.kind === 'dashboard') {
    return <DashboardPage />;
  }

  if (route.kind === 'documentation') {
    const { docRoute } = route;
    if (docRoute === 'introduction') {
      return <IntroductionPage />;
    }
    if (docRoute === 'workflow') {
      return <WorkflowPage />;
    }
    if (docRoute === 'imports') {
      return <ImportsPage />;
    }
    if (docRoute === 'enumerations') {
      return <EnumerationsPage />;
    }
    if (docRoute === 'datatypes') {
      return <DatatypesPage />;
    }
    if (docRoute === 'class-diagram') {
      return <ClassDiagramPage />;
    }
    if (docRoute === 'class-diagram/properties') {
      return <ClassPropertiesPage />;
    }
    if (docRoute === 'class-diagram/properties/details') {
      return <ClassDetailsPage />;
    }
    if (docRoute === 'class-diagram/properties/attributes') {
      return <ClassAttributesPage />;
    }
    if (docRoute === 'class-diagram/properties/operations') {
      return <ClassOperationsPage />;
    }
    if (docRoute === 'class-diagram/properties/generalizations') {
      return <ClassGeneralizationsPage />;
    }
    if (docRoute === 'class-diagram/properties/definitions') {
      return <ClassDefinitionsPage />;
    }
    if (docRoute === 'class-diagram/associations') {
      return <AssociationsPage />;
    }
    if (docRoute === 'class-diagram/invariants') {
      return <InvariantsPage />;
    }
    if (docRoute === 'object-diagram') {
      return <ObjectDiagramPage />;
    }
    if (docRoute === 'object-diagram/objects') {
      return <ObjectsPage />;
    }
    if (docRoute === 'object-diagram/object-links') {
      return <ObjectLinksPage />;
    }
    if (docRoute === 'object-diagram/operation-invocation') {
      return <OperationInvocationPage />;
    }
    return (
      <DocPlaceholderPage
        activeRoute={docRoute}
        title={docPageTitles[docRoute] ?? docRoute}
      />
    );
  }

  if (route.kind === 'projects') {
    return <ProjectsPage />;
  }

  if (route.kind === 'workspace') {
    return <WorkspaceLayout projectId={route.projectId} activeView={route.view} />;
  }

  return <NotFoundPage />;
}
