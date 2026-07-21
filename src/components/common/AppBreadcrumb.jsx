import { Link } from "react-router-dom";
import useBreadcrumbs from "use-react-router-breadcrumbs";

const AppBreadcrumb = () => {
  const breadcrumbs = useBreadcrumbs();

  return (
    <nav className="mb-6 text-sm">
      <ol className="flex items-center gap-2 text-muted-foreground">
        {breadcrumbs.map(({ match, breadcrumb }, index) => (
          <li key={match.pathname} className="flex items-center gap-2">
            {index !== 0 && <span>/</span>}

            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground">
                {breadcrumb}
              </span>
            ) : (
              <Link
                to={match.pathname}
                className="hover:text-primary transition-colors"
              >
                {breadcrumb}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default AppBreadcrumb;