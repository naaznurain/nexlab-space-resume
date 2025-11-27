import { auth } from '@clerk/nextjs/server';
import { Metadata } from 'next';
import ColabButton from '@/components/shared/ColabButton';
import ApproveButton from '@/components/shared/ApproveButton';
import RejectButton from '@/components/shared/RejectButton';
import CompleteProjectButton from '@/components/shared/CompleteProjectButton';
import { getProjectById } from '@/lib/actions/project.action';
import Image from 'next/image';
import User from '@/database/user.model';
import { ObjectId } from 'mongoose';

type URLProps = {
  params: { id: string };
};

type collaborator = { _id: string; name: string; picture?: string };
type applicant = { _id: string; name: string; picture?: string };

export async function generateMetadata({ params: { id } }: URLProps): Promise<Metadata> {
  return {
    title: `Project Details | NexLab`,
    description: `Explore detailed project information for ${id} on NexLab, including collaborators, status, and description.`,
  };
}

const CollaboratorCard = ({ name, picture }: { name: string; picture?: string }) => (
  <div className="flex flex-col items-center p-4 bg-white dark:bg-[#0F1117] border border-gray-200 dark:border-0 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
    {picture ? (
      <Image
        width={400}
        height={400}
        src={picture}
        alt={`${name}'s profile`}
        className="w-16 h-16 rounded-full object-cover"
      />
    ) : (
      <div className="w-16 h-16 flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full">
        N/A
      </div>
    )}
    <div className="mt-2 text-center">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{name}</h4>
    </div>
  </div>
);

const ApplicantCard = ({ applicant, projectId }: { applicant: applicant; projectId: string }) => (
  <div className="flex flex-col items-center p-4 bg-white dark:bg-[#0F1117] border border-gray-200 dark:border-0 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
    {applicant?.picture ? (
      <Image
        width={400}
        height={400}
        src={applicant?.picture}
        alt={`${applicant?.name}'s profile`}
        className="w-16 h-16 rounded-full object-cover border-2"
      />
    ) : (
      <div className="w-16 h-16 flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full">
        N/A
      </div>
    )}
    <div className="mt-2 text-center">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{applicant?.name}</h4>
      <div className="flex mt-2 space-x-2">
        <ApproveButton projectId={projectId} userId={applicant?._id} />
        <RejectButton projectId={projectId} userId={applicant?._id} />
      </div>
    </div>
  </div>
);

const ProjectDetailPage = async ({ params: { id } }: URLProps) => {
  const { userId } = await auth();

  try {
    // Fetch project as plain object
    const { project: rawProject } = await getProjectById({ projectId: id });
    if (!rawProject) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <h1 className="text-2xl font-semibold">Project Not Found</h1>
          <p className="mt-4 text-xl font-light">The project ID you entered may be incorrect. Please try again.</p>
        </div>
      );
    }

    // Convert Mongoose document to plain object
    const project = JSON.parse(JSON.stringify(rawProject));

    const isAuthor = userId === project?.authorClerkId;

interface IUser {
  _id: string;
  name?: string;
  picture?: string;
}

const applicantsWithDetails = await Promise.all(
  project.applicants?.map(async (applicantId: ObjectId) => {
    const user = await User.findById(applicantId).lean<IUser>();
    if (!user) return { _id: '', name: 'Unknown', picture: null };
    return {
      _id: user._id.toString(),
      name: user.name || 'Unknown',
      picture: user.picture || null,
    };
  }) || []
);

    return (
      <div className="w-full -mt-8 mx-auto px-4 py-2 rounded-md bg-gray-100 dark:bg-black">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 transition-all duration-200">
              {project.title || 'Untitled Project'}
            </h1>
            <div className="flex items-center mt-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Created on{' '}
                <span className="text-gray-800 dark:text-gray-200 font-semibold">
                  {new Date(project.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </span>
            </div>
          </div>
          <span
            className={`mt-4 sm:mt-0 px-6 py-2 text-sm font-medium rounded-full ${
              project.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : project.status === 'ongoing'
                ? 'bg-gray-200 text-gray-700'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {project.status || 'Unknown'}
          </span>
        </header>

        {/* Description */}
        <section>
          <h2 className="text-xl font-semibold text-gray-500 dark:text-gray-300 mt-10 mb-6">Project Description</h2>
          <div className="mt-4 bg-white dark:bg-[#c8cbd40c] p-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
            <div className="prose dark:prose-dark mt-2 text-gray-800 dark:text-zinc-200">
              <div dangerouslySetInnerHTML={{ __html: project.description || 'No description provided.' }} />
            </div>
          </div>
        </section>

        {/* Author */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Author</h2>
          <CollaboratorCard name={project?.author?.name || 'Unknown'} picture={project?.author?.picture} />
        </section>

        {/* Collaborators */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mt-10 mb-6">Collaborators</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {project?.collaborators?.map((collaborator: collaborator) => (
              <CollaboratorCard key={collaborator?._id} name={collaborator?.name} picture={collaborator?.picture} />
            ))}
          </div>
  {project.status === 'ongoing' && !isAuthor && (
    <div className="mt-6 text-center">
      <ColabButton projectId={id} />
    </div>
  )}
        </section>

        {/* Applicants */}
        {isAuthor && project?.applicants?.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Applicants</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {applicantsWithDetails?.map((applicant) => (
                <ApplicantCard key={applicant?._id} applicant={applicant} projectId={id} />
              ))}
            </div>
          </section>
        )}

        {/* Complete Project Button */}
        {isAuthor && (
          <section className="mt-10">
            <CompleteProjectButton projectId={id} />
          </section>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error fetching project details:', error);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-red-500 to-red-700 text-white">
        <h1 className="text-4xl font-semibold">Error</h1>
        <p className="mt-4 text-lg">Something went wrong. Please try again later.</p>
      </div>
    );
  }
};

export default ProjectDetailPage;