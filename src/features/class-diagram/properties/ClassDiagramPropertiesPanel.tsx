import type { ProjectDto, ProjectReadModelDto } from '../../../api/dtos';
import type { SelectionState } from '../../../state';
import { AssociationPropertiesPanel } from './AssociationPropertiesPanel';
import { ClassPropertiesPanel } from './ClassPropertiesPanel';
import { InvariantPropertiesPanel } from './InvariantPropertiesPanel';
import { ImportPropertiesPanel, PackagePropertiesPanel } from './PackageImportPropertiesPanel';
import { DataTypePropertiesPanel, EnumerationPropertiesPanel } from './ModelTypePropertiesPanel';

interface ClassDiagramPropertiesPanelProps {
  project: ProjectDto | null;
  readModel: ProjectReadModelDto | null;
  selection: SelectionState;
  onProjectChange: (project: ProjectDto) => void;
  onRefreshProject: () => Promise<boolean>;
}

export function ClassDiagramPropertiesPanel({
  project,
  readModel,
  selection,
  onProjectChange,
  onRefreshProject,
}: ClassDiagramPropertiesPanelProps) {
  if (!project) {
    return <p>Project data is not loaded.</p>;
  }

  if (!selection || selection.view !== 'class-diagram') {
    return <p>Select a class, association or invariant in the class diagram.</p>;
  }

  if (selection.type === 'class') {
    const umlClass = project.umlModel.classes.find((candidate) => candidate.id === selection.id);
    const projection = readModel?.classes.find((candidate) => candidate.id === selection.id);
    return umlClass ? (
      <ClassPropertiesPanel
        project={project}
        umlClass={umlClass}
        readModel={readModel}
        onProjectChange={onProjectChange}
        onRefreshProject={onRefreshProject}
      />
    ) : projection ? <ReadOnlyImportedClass projection={projection} /> : <p>The selected class no longer exists.</p>;
  }
  if (selection.type === 'enumeration') {
    const enumeration = (project.umlModel.enumerations ?? []).find((item) => item.id === selection.id);
    return enumeration ? <EnumerationPropertiesPanel project={project} enumeration={enumeration} revision={readModel?.readVersion ?? ''} onRefreshProject={onRefreshProject} /> : <p>The selected enumeration no longer exists.</p>;
  }
  if (selection.type === 'dataType') {
    const dataType = (project.umlModel.dataTypes ?? []).find((item) => item.id === selection.id);
    return dataType ? <DataTypePropertiesPanel project={project} dataType={dataType} revision={readModel?.readVersion ?? ''} onRefreshProject={onRefreshProject} /> : <p>The selected DataType no longer exists.</p>;
  }

  if (selection.type === 'import') {
    const modelImport = (project.umlModel.imports ?? []).find((candidate) => candidate.id === selection.id);
    return modelImport ? (
      <ImportPropertiesPanel
        project={project}
        readModel={readModel}
        modelImport={modelImport}
        readVersion={readModel?.readVersion ?? ''}
        onRefreshProject={onRefreshProject}
      />
    ) : <p>The selected import no longer exists.</p>;
  }

  if (selection.type === 'package') {
    const umlPackage = (project.umlModel.packages ?? []).find((candidate) => candidate.id === selection.id);
    return umlPackage ? (
      <PackagePropertiesPanel
        project={project}
        readModel={readModel}
        umlPackage={umlPackage}
        readVersion={readModel?.readVersion ?? ''}
        onRefreshProject={onRefreshProject}
      />
    ) : <p>The selected package no longer exists.</p>;
  }

  if (selection.type === 'association') {
    const association = project.umlModel.associations.find(
      (candidate) => candidate.id === selection.id,
    );
    return association ? (
      <AssociationPropertiesPanel
        project={project}
        association={association}
        readVersion={readModel?.readVersion ?? ''}
        onRefreshProject={onRefreshProject}
      />
    ) : (
      <p>The selected association no longer exists.</p>
    );
  }

  if (selection.type === 'invariant') {
    const invariant = project.umlModel.invariants.find(
      (candidate) => candidate.id === selection.id,
    );
    return invariant ? (
      <InvariantPropertiesPanel
        project={project}
        invariant={invariant}
        readVersion={readModel?.readVersion ?? ''}
        onRefreshProject={onRefreshProject}
      />
    ) : (
      <p>The selected invariant no longer exists.</p>
    );
  }

  return <p>Select a class diagram element.</p>;
}

function ReadOnlyImportedClass({ projection }: { projection: NonNullable<ProjectReadModelDto['classes']>[number] }) {
  return (
    <div className="properties-content">
      <h3>Class Properties</h3>
      <span className="readonly-badge">IMPORTED · READ ONLY</span>
      <dl className="property-definition-list">
        <dt>Name</dt><dd>{projection.name}</dd>
        <dt>Qualified name</dt><dd>{projection.qualifiedName}</dd>
        <dt>Kind</dt><dd>{projection.abstractClass ? 'Abstract class' : 'Class'}</dd>
      </dl>
      <section className="property-section"><h4>Attributes</h4>{projection.attributes.length ? projection.attributes.map((feature) => <p key={feature.id}>{feature.name} : {feature.type}</p>) : <p className="property-empty">No attributes.</p>}</section>
      <section className="property-section"><h4>Operations</h4>{projection.operations.length ? projection.operations.map((feature) => <p key={feature.id}>{feature.name} : {feature.type}</p>) : <p className="property-empty">No operations.</p>}</section>
    </div>
  );
}
