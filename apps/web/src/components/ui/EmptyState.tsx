import Link from 'next/link';

interface EmptyStateProps {
    title: string;
    description: string;
    actionHref?: string;
    actionLabel?: string;
    icon?: React.ReactNode;
}

export function EmptyState({ title, description, actionHref, actionLabel, icon }: EmptyStateProps) {
    return (
        <div className="text-center py-12 px-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                {icon || (
                    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                )}
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
            {actionHref && actionLabel && (
                <div className="mt-6">
                    <Link
                        href={actionHref}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                        {actionLabel}
                    </Link>
                </div>
            )}
        </div>
    );
}
