import React from 'react';

export function PostCardSkeleton() {
  return (
    <div 
      className="post-card"
      style={{ 
        opacity: 0.6,
        pointerEvents: 'none',
        cursor: 'default'
      }}
    >
      <div className="post-header">
        <div 
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '10px',
            backgroundColor: 'var(--surface-hover)',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div 
            style={{
              height: '20px',
              backgroundColor: 'var(--surface-hover)',
              borderRadius: '6px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
          <div 
            style={{
              height: '14px',
              width: '60%',
              backgroundColor: 'var(--surface-hover)',
              borderRadius: '6px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
        </div>
      </div>
      <div 
        style={{
          height: '16px',
          backgroundColor: 'var(--surface-hover)',
          borderRadius: '6px',
          marginBottom: '12px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}
      />
      <div style={{ display: 'flex', gap: '12px' }}>
        <div 
          style={{
            height: '32px',
            width: '80px',
            backgroundColor: 'var(--surface-hover)',
            borderRadius: '9999px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div 
      style={{
        padding: '16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: '12px',
        opacity: 0.6
      }}
    >
      <div 
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'var(--surface-hover)',
          flexShrink: 0,
          animation: 'pulse 1.5s ease-in-out infinite'
        }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div 
          style={{
            height: '14px',
            width: '40%',
            backgroundColor: 'var(--surface-hover)',
            borderRadius: '6px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
        <div 
          style={{
            height: '16px',
            backgroundColor: 'var(--surface-hover)',
            borderRadius: '6px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
        <div 
          style={{
            height: '16px',
            width: '80%',
            backgroundColor: 'var(--surface-hover)',
            borderRadius: '6px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div style={{ padding: '20px' }}>
      <div 
        style={{
          height: '120px',
          backgroundColor: 'var(--surface-hover)',
          borderRadius: '16px',
          marginBottom: '24px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '28px' }}>
        {[...Array(3)].map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
