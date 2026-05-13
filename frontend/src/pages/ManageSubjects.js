import React, { useState, useEffect, useCallback } from 'react';
import API_BASE_URL from '../config/api';
import '../styles/manageSubjects.css';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSearch,
  FaToggleOn,
  FaToggleOff,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaBook,
  FaChevronDown,
  FaCheck
} from 'react-icons/fa';

const ManageSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'edit', 'view'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showModalCategoryDropdown, setShowModalCategoryDropdown] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Regular',
    price: '',
    classes: ''
  });

  const categoryOptions = [
    { 
      value: 'Regular', 
      label: 'Regular', 
      description: 'Standard academic subjects',
      color: '#3b82f6',
      bgColor: '#eff6ff'
    },
    { 
      value: 'Explore More', 
      label: 'Explore More', 
      description: 'Additional learning topics',
      color: '#f59e0b',
      bgColor: '#fffbeb'
    },
    { 
      value: 'Advanced', 
      label: 'Advanced', 
      description: 'High-level specialized courses',
      color: '#ef4444',
      bgColor: '#fef2f2'
    }
  ];

  const handleCategorySelect = (value) => {
    setFormData(prev => ({ ...prev, category: value }));
    setShowCategoryDropdown(false);
  };

  const handleModalCategorySelect = (value) => {
    setFormData(prev => ({ ...prev, category: value }));
    setShowModalCategoryDropdown(false);
  };

  // Fetch subjects
  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`${API_BASE_URL}/api/subjects?${queryParams}`);
      const data = await response.json();
      
      if (response.ok) {
        setSubjects(data.subjects);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch subjects');
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.custom-dropdown-container')) {
        setShowCategoryDropdown(false);
        setShowModalCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'classes') {
      // Store the raw string value, we'll convert to array on form submission
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Regular',
      price: '',
      classes: ''
    });
  };

  // Open modal
  const openModal = (type, subject) => {
    setModalType(type);
    setSelectedSubject(subject);
    
    setFormData({
      name: subject.name || '',
      category: subject.category || 'Regular',
      price: subject.price || '',
      classes: subject.classes ? subject.classes.join(', ') : ''
    });
    
    setShowModal(true);
  };

  // Toggle Add Form
  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
    if (!showAddForm) {
      resetForm();
    }
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedSubject(null);
    resetForm();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Prepare JSON data instead of FormData
      const dataToSend = {
        name: formData.name,
        category: formData.category,
        price: formData.price,
        classes: formData.classes ? formData.classes.split(',').map(v => v.trim()).filter(v => v) : []
      };

      const isEdit = modalType === 'edit';
      const url = isEdit 
        ? `${API_BASE_URL}/api/subjects/${selectedSubject._id}`
        : `${API_BASE_URL}/api/subjects`;
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        if (isEdit) {
          closeModal();
        } else {
          setShowAddForm(false);
          resetForm();
        }
        fetchSubjects();
      } else {
        alert(data.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred. Please try again.');
    }
  };

  // Delete subject
  const handleDelete = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/subjects/${subjectId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        fetchSubjects();
      } else {
        alert(data.message || 'Failed to delete subject');
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('An error occurred while deleting the subject.');
    }
  };

  // Toggle subject status
  const toggleStatus = async (subjectId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/subjects/${subjectId}/toggle-status`, {
        method: 'PATCH'
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        fetchSubjects();
      } else {
        alert(data.message || 'Failed to toggle status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('An error occurred while updating the status.');
    }
  };

  return (
    <div className="manage-subjects-page">
      {/* Header */}
      <div className="subjects-page-header">
        <div className="header-content">
          <h2><FaBook className="header-icon" />Manage Subjects</h2>
          <p>Create, edit, and manage educational subjects for your institution</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-number">{pagination.totalSubjects || 0}</span>
            <span className="stat-label">Total Subjects</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{subjects.filter(s => s.isActive).length}</span>
            <span className="stat-label">Active</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-section">
        <div className="filters">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <button
          onClick={toggleAddForm}
          className="add-btn"
        >
          {showAddForm ? <FaTimes className="btn-icon" /> : <FaPlus className="btn-icon" />}
          {showAddForm ? 'Cancel' : 'Add Subject'}
        </button>
      </div>

      {/* Add Subject Form */}
      {showAddForm && (
        <div className="add-subject-form-container">
          <div className="add-form-header">
            <h3><FaPlus className="form-icon" />Add New Subject</h3>
          </div>
          <form onSubmit={handleSubmit} className="add-subject-form">
            <div className="form-row">
              <div className="form-group">
                <label>Subject Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter subject name"
                />
              </div>
              
              <div className="form-group">
                <label>Price</label>
                <input
                  type="text"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="e.g., Free, ₹500, ₹1000"
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <div className="custom-dropdown-container">
                  <div 
                    className={`custom-dropdown-trigger ${showCategoryDropdown ? 'active' : ''}`}
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  >
                    <div className="selected-category">
                      <div 
                        className="category-indicator"
                        style={{ 
                          backgroundColor: categoryOptions.find(opt => opt.value === formData.category)?.bgColor,
                          color: categoryOptions.find(opt => opt.value === formData.category)?.color
                        }}
                      >
                        <div 
                          className="category-dot"
                          style={{ backgroundColor: categoryOptions.find(opt => opt.value === formData.category)?.color }}
                        ></div>
                      </div>
                      <div className="category-text">
                        <span className="category-label">
                          {categoryOptions.find(opt => opt.value === formData.category)?.label || 'Select Category'}
                        </span>
                        <span className="category-description">
                          {categoryOptions.find(opt => opt.value === formData.category)?.description}
                        </span>
                      </div>
                    </div>
                    <FaChevronDown className={`dropdown-arrow ${showCategoryDropdown ? 'rotated' : ''}`} />
                  </div>
                  
                  {showCategoryDropdown && (
                    <div className="custom-dropdown-menu">
                      {categoryOptions.map((option) => (
                        <div
                          key={option.value}
                          className={`dropdown-option ${formData.category === option.value ? 'selected' : ''}`}
                          onClick={() => handleCategorySelect(option.value)}
                        >
                          <div className="option-content">
                            <div 
                              className="category-indicator"
                              style={{ backgroundColor: option.bgColor, color: option.color }}
                            >
                              <div 
                                className="category-dot"
                                style={{ backgroundColor: option.color }}
                              ></div>
                            </div>
                            <div className="option-text">
                              <span className="option-label">{option.label}</span>
                              <span className="option-description">{option.description}</span>
                            </div>
                          </div>
                          {formData.category === option.value && (
                            <FaCheck className="check-icon" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Classes</label>
                <input
                  type="text"
                  name="classes"
                  value={formData.classes}
                  onChange={handleInputChange}
                  placeholder="e.g., 9, 10, 11, 12"
                />
              </div>
            </div>

            <div className="form-actions-inline">
              <button type="button" onClick={toggleAddForm} className="cancel-btn-inline">
                Cancel
              </button>
              <button type="submit" className="submit-btn-inline">
                Add Subject
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subjects Table */}
      <div className="subjects-container">
        {loading ? (
          <div className="subjects-loading-spinner">
            <div className="subjects-spinner"></div>
            <p>Loading subjects...</p>
          </div>
        ) : (
          <div className="subjects-table-container">
            <table className="subjects-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Classes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => (
                  <tr key={subject._id}>
                    <td>
                      <div className="subject-info">
                        {subject.image ? (
                          <img 
                            src={`${API_BASE_URL}/uploads/${subject.image}`}
                            alt={subject.name}
                            className="subject-image"
                          />
                        ) : (
                          <div className="subject-placeholder">
                            <FaBook />
                          </div>
                        )}
                        <div className="subject-details">
                          <span className="subject-name">{subject.name}</span>
                          {subject.description && (
                            <span className="subject-description">{subject.description}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`category-badge category-${subject.category.toLowerCase().replace(' ', '-')}`}>
                        {subject.category}
                      </span>
                    </td>
                    <td>{subject.price}</td>
                    <td>{subject.classes?.join(', ') || 'Not specified'}</td>
                    <td>
                      <span className={`status-badge ${subject.isActive ? 'active' : 'inactive'}`}>
                        {subject.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="subject-action-buttons">
                        <button
                          onClick={() => openModal('edit', subject)}
                          className="subject-action-btn edit-btn"
                          title="Edit Subject"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => toggleStatus(subject._id)}
                          className="subject-action-btn toggle-btn"
                          title={subject.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {subject.isActive ? <FaToggleOn /> : <FaToggleOff />}
                        </button>
                        <button
                          onClick={() => handleDelete(subject._id)}
                          className="subject-action-btn delete-btn"
                          title="Delete Subject"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {subjects.length === 0 && (
              <div className="no-data">
                <FaBook className="no-data-icon" />
                <p>No subjects found</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              <FaChevronLeft />
            </button>
            
            <span className="pagination-info">
              Page {currentPage} of {pagination.totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
              className="pagination-btn"
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Subject</h3>
              <button onClick={closeModal} className="close-btn">
                <FaTimes />
              </button>
            </div>

            <div className="modal-content">
              <form onSubmit={handleSubmit} className="subject-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Subject Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                        placeholder="Enter subject name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Category *</label>
                      <div className="custom-dropdown-container">
                        <div 
                          className={`custom-dropdown-trigger ${showModalCategoryDropdown ? 'active' : ''}`}
                          onClick={() => setShowModalCategoryDropdown(!showModalCategoryDropdown)}
                        >
                          <div className="selected-category">
                            <div 
                              className="category-indicator"
                              style={{ 
                                backgroundColor: categoryOptions.find(opt => opt.value === formData.category)?.bgColor,
                                color: categoryOptions.find(opt => opt.value === formData.category)?.color
                              }}
                            >
                              <div 
                                className="category-dot"
                                style={{ backgroundColor: categoryOptions.find(opt => opt.value === formData.category)?.color }}
                              ></div>
                            </div>
                            <div className="category-text">
                              <span className="category-label">
                                {categoryOptions.find(opt => opt.value === formData.category)?.label || 'Select Category'}
                              </span>
                              <span className="category-description">
                                {categoryOptions.find(opt => opt.value === formData.category)?.description}
                              </span>
                            </div>
                          </div>
                          <FaChevronDown className={`dropdown-arrow ${showModalCategoryDropdown ? 'rotated' : ''}`} />
                        </div>
                        
                        {showModalCategoryDropdown && (
                          <div className="custom-dropdown-menu">
                            {categoryOptions.map((option) => (
                              <div
                                key={option.value}
                                className={`dropdown-option ${formData.category === option.value ? 'selected' : ''}`}
                                onClick={() => handleModalCategorySelect(option.value)}
                              >
                                <div className="option-content">
                                  <div 
                                    className="category-indicator"
                                    style={{ backgroundColor: option.bgColor, color: option.color }}
                                  >
                                    <div 
                                      className="category-dot"
                                      style={{ backgroundColor: option.color }}
                                    ></div>
                                  </div>
                                  <div className="option-text">
                                    <span className="option-label">{option.label}</span>
                                    <span className="option-description">{option.description}</span>
                                  </div>
                                </div>
                                {formData.category === option.value && (
                                  <FaCheck className="check-icon" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Price</label>
                      <input
                        type="text"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        placeholder="e.g., Free, ₹500, ₹1000"
                      />
                    </div>

                    <div className="form-group">
                      <label>Classes</label>
                      <input
                        type="text"
                        name="classes"
                        value={formData.classes}
                        onChange={handleInputChange}
                        placeholder="e.g., 9, 10, 11, 12"
                      />
                    </div>
                  </div>

                  <div className="modal-form-actions">
                    <button type="button" onClick={closeModal} className="modal-cancel-btn">
                      Cancel
                    </button>
                    <button type="submit" className="modal-submit-btn">
                      Update Subject
                    </button>
                  </div>
                </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSubjects;