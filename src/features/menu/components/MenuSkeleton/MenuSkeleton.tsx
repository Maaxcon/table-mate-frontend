import "./MenuSkeleton.css"

type MenuSkeletonProps = {
  count?: number
}

function MenuSkeleton({ count = 6 }: MenuSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="menu-skeleton__card">
          <div className="menu-skeleton__image" />
          <div className="menu-skeleton__body">
            <div className="menu-skeleton__line menu-skeleton__line--title" />
            <div className="menu-skeleton__line" />
            <div className="menu-skeleton__line menu-skeleton__line--short" />
          </div>
          <div className="menu-skeleton__footer">
            <div className="menu-skeleton__line menu-skeleton__line--price" />
            <div className="menu-skeleton__circle" />
          </div>
        </div>
      ))}
    </>
  )
}

export default MenuSkeleton
