'use client';

import { useState } from 'react';
import { Power, PowerOff, Trash2 } from 'lucide-react';
import { Assistant } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface AssistantActionsProps {
  assistant: Assistant;
}

export default function AssistantActions({ assistant }: AssistantActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(assistant.isActive);
  const router = useRouter();

  const toggleAssistantStatus = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/assistants/${assistant._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (response.ok) {
        setCurrentStatus(!currentStatus);
        // Refresh the page to show updated data
        router.refresh();
      } else {
        console.error('Failed to update assistant status');
      }
    } catch (error) {
      console.error('Error updating assistant status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteAssistant = async () => {
    if (!confirm(`Are you sure you want to delete "${assistant.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/assistants/${assistant._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh the page to show updated data
        router.refresh();
      } else {
        alert('Failed to delete assistant');
      }
    } catch (error) {
      console.error('Error deleting assistant:', error);
      alert('Failed to delete assistant');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <button
        onClick={toggleAssistantStatus}
        disabled={isUpdating}
        className={`p-2 rounded-md transition-colors ${
          isUpdating
            ? 'opacity-50 cursor-not-allowed'
            : currentStatus
            ? 'text-orange-600 hover:bg-orange-50'
            : 'text-green-600 hover:bg-green-50'
        }`}
        title={currentStatus ? 'Deactivate' : 'Activate'}
      >
        {currentStatus ? (
          <PowerOff className="h-4 w-4" />
        ) : (
          <Power className="h-4 w-4" />
        )}
      </button>
      
      <button
        onClick={deleteAssistant}
        disabled={isUpdating}
        className={`p-2 rounded-md transition-colors ${
          isUpdating
            ? 'opacity-50 cursor-not-allowed'
            : 'text-red-600 hover:bg-red-50'
        }`}
        title="Delete Assistant"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </>
  );
}