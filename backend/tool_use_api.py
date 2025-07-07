"""
Tool Use API
Provides file system, Git, and web search capabilities
"""
import os
import json
import logging
import requests
import subprocess
from typing import Dict, Any, List, Optional
from datetime import datetime
import tempfile
from pathlib import Path
import git
from git import Repo
import urllib.parse
import urllib.request
from bs4 import BeautifulSoup
import shutil

from config import CONFIG

logger = logging.getLogger(__name__)

class ToolUseAPI:
    """Provides various tools for ALI system operations"""
    
    def __init__(self):
        self.tools = {
            "file_read": self._file_read,
            "file_write": self._file_write,
            "file_list": self._file_list,
            "file_delete": self._file_delete,
            "file_copy": self._file_copy,
            "file_move": self._file_move,
            "directory_create": self._directory_create,
            "directory_list": self._directory_list,
            "git_clone": self._git_clone,
            "git_commit": self._git_commit,
            "git_push": self._git_push,
            "git_pull": self._git_pull,
            "git_status": self._git_status,
            "git_branch": self._git_branch,
            "web_search": self._web_search,
            "web_scrape": self._web_scrape,
            "http_request": self._http_request,
            "json_parse": self._json_parse,
            "text_process": self._text_process
        }
        
        # Working directory for file operations
        self.working_dir = tempfile.mkdtemp(prefix="ali_workspace_")
        
        logger.info(f"Tool Use API initialized with workspace: {self.working_dir}")
    
    def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool with given parameters"""
        
        logger.info(f"Executing tool: {tool_name}")
        
        if tool_name not in self.tools:
            return {
                "success": False,
                "error": f"Unknown tool: {tool_name}",
                "available_tools": list(self.tools.keys())
            }
        
        try:
            result = self.tools[tool_name](parameters)
            return {
                "success": True,
                "result": result,
                "tool": tool_name,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "tool": tool_name,
                "timestamp": datetime.now().isoformat()
            }
    
    def _file_read(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Read file content"""
        
        file_path = params.get("file_path")
        if not file_path:
            raise ValueError("file_path is required")
        
        # Secure path handling
        full_path = self._get_secure_path(file_path)
        
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not os.path.isfile(full_path):
            raise ValueError(f"Path is not a file: {file_path}")
        
        # Read file with encoding detection
        encoding = params.get("encoding", "utf-8")
        
        try:
            with open(full_path, "r", encoding=encoding) as f:
                content = f.read()
        except UnicodeDecodeError:
            # Try with different encoding
            with open(full_path, "r", encoding="latin-1") as f:
                content = f.read()
            encoding = "latin-1"
        
        return {
            "content": content,
            "file_path": file_path,
            "encoding": encoding,
            "size": os.path.getsize(full_path)
        }
    
    def _file_write(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Write content to file"""
        
        file_path = params.get("file_path")
        content = params.get("content")
        
        if not file_path:
            raise ValueError("file_path is required")
        
        if content is None:
            raise ValueError("content is required")
        
        # Secure path handling
        full_path = self._get_secure_path(file_path)
        
        # Create directory if needed
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # Write file
        encoding = params.get("encoding", "utf-8")
        mode = params.get("mode", "w")  # w = overwrite, a = append
        
        with open(full_path, mode, encoding=encoding) as f:
            f.write(content)
        
        return {
            "file_path": file_path,
            "bytes_written": len(content.encode(encoding)),
            "mode": mode
        }
    
    def _file_list(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List files in directory"""
        
        directory = params.get("directory", ".")
        pattern = params.get("pattern", "*")
        recursive = params.get("recursive", False)
        
        # Secure path handling
        full_path = self._get_secure_path(directory)
        
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Directory not found: {directory}")
        
        if not os.path.isdir(full_path):
            raise ValueError(f"Path is not a directory: {directory}")
        
        files = []
        
        if recursive:
            for root, dirs, filenames in os.walk(full_path):
                for filename in filenames:
                    if self._match_pattern(filename, pattern):
                        rel_path = os.path.relpath(os.path.join(root, filename), full_path)
                        files.append({
                            "name": filename,
                            "path": rel_path,
                            "size": os.path.getsize(os.path.join(root, filename)),
                            "modified": datetime.fromtimestamp(
                                os.path.getmtime(os.path.join(root, filename))
                            ).isoformat()
                        })
        else:
            for item in os.listdir(full_path):
                item_path = os.path.join(full_path, item)
                if os.path.isfile(item_path) and self._match_pattern(item, pattern):
                    files.append({
                        "name": item,
                        "path": item,
                        "size": os.path.getsize(item_path),
                        "modified": datetime.fromtimestamp(
                            os.path.getmtime(item_path)
                        ).isoformat()
                    })
        
        return {
            "directory": directory,
            "files": files,
            "total_files": len(files)
        }
    
    def _file_delete(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Delete file"""
        
        file_path = params.get("file_path")
        if not file_path:
            raise ValueError("file_path is required")
        
        # Secure path handling
        full_path = self._get_secure_path(file_path)
        
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if os.path.isfile(full_path):
            os.remove(full_path)
        elif os.path.isdir(full_path):
            shutil.rmtree(full_path)
        
        return {
            "file_path": file_path,
            "deleted": True
        }
    
    def _file_copy(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Copy file"""
        
        source = params.get("source")
        destination = params.get("destination")
        
        if not source or not destination:
            raise ValueError("source and destination are required")
        
        # Secure path handling
        source_path = self._get_secure_path(source)
        dest_path = self._get_secure_path(destination)
        
        if not os.path.exists(source_path):
            raise FileNotFoundError(f"Source file not found: {source}")
        
        # Create destination directory if needed
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        
        if os.path.isfile(source_path):
            shutil.copy2(source_path, dest_path)
        elif os.path.isdir(source_path):
            shutil.copytree(source_path, dest_path)
        
        return {
            "source": source,
            "destination": destination,
            "copied": True
        }
    
    def _file_move(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Move file"""
        
        source = params.get("source")
        destination = params.get("destination")
        
        if not source or not destination:
            raise ValueError("source and destination are required")
        
        # Secure path handling
        source_path = self._get_secure_path(source)
        dest_path = self._get_secure_path(destination)
        
        if not os.path.exists(source_path):
            raise FileNotFoundError(f"Source file not found: {source}")
        
        # Create destination directory if needed
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        
        shutil.move(source_path, dest_path)
        
        return {
            "source": source,
            "destination": destination,
            "moved": True
        }
    
    def _directory_create(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create directory"""
        
        directory = params.get("directory")
        if not directory:
            raise ValueError("directory is required")
        
        # Secure path handling
        full_path = self._get_secure_path(directory)
        
        os.makedirs(full_path, exist_ok=True)
        
        return {
            "directory": directory,
            "created": True
        }
    
    def _directory_list(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List directory contents"""
        
        directory = params.get("directory", ".")
        
        # Secure path handling
        full_path = self._get_secure_path(directory)
        
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Directory not found: {directory}")
        
        if not os.path.isdir(full_path):
            raise ValueError(f"Path is not a directory: {directory}")
        
        items = []
        
        for item in os.listdir(full_path):
            item_path = os.path.join(full_path, item)
            is_dir = os.path.isdir(item_path)
            
            items.append({
                "name": item,
                "type": "directory" if is_dir else "file",
                "size": 0 if is_dir else os.path.getsize(item_path),
                "modified": datetime.fromtimestamp(
                    os.path.getmtime(item_path)
                ).isoformat()
            })
        
        return {
            "directory": directory,
            "items": items,
            "total_items": len(items)
        }
    
    def _git_clone(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Clone Git repository"""
        
        repo_url = params.get("repo_url")
        local_path = params.get("local_path")
        
        if not repo_url:
            raise ValueError("repo_url is required")
        
        if not local_path:
            local_path = os.path.basename(repo_url.rstrip('/').rstrip('.git'))
        
        # Secure path handling
        full_path = self._get_secure_path(local_path)
        
        # Clone repository
        repo = Repo.clone_from(repo_url, full_path)
        
        return {
            "repo_url": repo_url,
            "local_path": local_path,
            "cloned": True,
            "commit": repo.head.commit.hexsha
        }
    
    def _git_commit(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Commit changes to Git repository"""
        
        repo_path = params.get("repo_path", ".")
        message = params.get("message", "ALI automated commit")
        
        # Secure path handling
        full_path = self._get_secure_path(repo_path)
        
        # Open repository
        repo = Repo(full_path)
        
        # Add all changes
        repo.git.add(A=True)
        
        # Commit
        commit = repo.index.commit(message)
        
        return {
            "repo_path": repo_path,
            "message": message,
            "commit": commit.hexsha,
            "committed": True
        }
    
    def _git_push(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Push changes to remote repository"""
        
        repo_path = params.get("repo_path", ".")
        remote = params.get("remote", "origin")
        branch = params.get("branch", "main")
        
        # Secure path handling
        full_path = self._get_secure_path(repo_path)
        
        # Open repository
        repo = Repo(full_path)
        
        # Push to remote
        origin = repo.remote(remote)
        origin.push(branch)
        
        return {
            "repo_path": repo_path,
            "remote": remote,
            "branch": branch,
            "pushed": True
        }
    
    def _git_pull(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Pull changes from remote repository"""
        
        repo_path = params.get("repo_path", ".")
        remote = params.get("remote", "origin")
        branch = params.get("branch", "main")
        
        # Secure path handling
        full_path = self._get_secure_path(repo_path)
        
        # Open repository
        repo = Repo(full_path)
        
        # Pull from remote
        origin = repo.remote(remote)
        origin.pull(branch)
        
        return {
            "repo_path": repo_path,
            "remote": remote,
            "branch": branch,
            "pulled": True
        }
    
    def _git_status(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get Git repository status"""
        
        repo_path = params.get("repo_path", ".")
        
        # Secure path handling
        full_path = self._get_secure_path(repo_path)
        
        # Open repository
        repo = Repo(full_path)
        
        # Get status
        status = {
            "branch": repo.active_branch.name,
            "commit": repo.head.commit.hexsha,
            "modified": [item.a_path for item in repo.index.diff(None)],
            "staged": [item.a_path for item in repo.index.diff("HEAD")],
            "untracked": repo.untracked_files
        }
        
        return {
            "repo_path": repo_path,
            "status": status
        }
    
    def _git_branch(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Git branch operations"""
        
        repo_path = params.get("repo_path", ".")
        action = params.get("action", "list")  # list, create, switch, delete
        branch_name = params.get("branch_name")
        
        # Secure path handling
        full_path = self._get_secure_path(repo_path)
        
        # Open repository
        repo = Repo(full_path)
        
        if action == "list":
            branches = [branch.name for branch in repo.branches]
            return {
                "repo_path": repo_path,
                "branches": branches,
                "current": repo.active_branch.name
            }
        
        elif action == "create":
            if not branch_name:
                raise ValueError("branch_name is required for create action")
            
            new_branch = repo.create_head(branch_name)
            return {
                "repo_path": repo_path,
                "branch_name": branch_name,
                "created": True
            }
        
        elif action == "switch":
            if not branch_name:
                raise ValueError("branch_name is required for switch action")
            
            repo.git.checkout(branch_name)
            return {
                "repo_path": repo_path,
                "branch_name": branch_name,
                "switched": True
            }
        
        elif action == "delete":
            if not branch_name:
                raise ValueError("branch_name is required for delete action")
            
            repo.delete_head(branch_name)
            return {
                "repo_path": repo_path,
                "branch_name": branch_name,
                "deleted": True
            }
        
        else:
            raise ValueError(f"Unknown action: {action}")
    
    def _web_search(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search the web (simple implementation)"""
        
        query = params.get("query")
        if not query:
            raise ValueError("query is required")
        
        # Simple web search using DuckDuckGo
        search_url = f"https://duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        
        try:
            response = requests.get(search_url, timeout=10)
            response.raise_for_status()
            
            # Parse search results
            soup = BeautifulSoup(response.text, 'html.parser')
            results = []
            
            for result in soup.find_all('div', class_='result')[:5]:  # Top 5 results
                title_elem = result.find('a', class_='result__a')
                snippet_elem = result.find('div', class_='result__snippet')
                
                if title_elem and snippet_elem:
                    results.append({
                        "title": title_elem.text.strip(),
                        "url": title_elem.get('href'),
                        "snippet": snippet_elem.text.strip()
                    })
            
            return {
                "query": query,
                "results": results,
                "total_results": len(results)
            }
            
        except Exception as e:
            logger.error(f"Web search error: {str(e)}")
            return {
                "query": query,
                "results": [],
                "error": str(e)
            }
    
    def _web_scrape(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Scrape web page content"""
        
        url = params.get("url")
        if not url:
            raise ValueError("url is required")
        
        # Check if URL is in allowed domains
        parsed_url = urllib.parse.urlparse(url)
        if parsed_url.netloc not in CONFIG.allowed_domains:
            raise ValueError(f"Domain not allowed: {parsed_url.netloc}")
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract text content
            text = soup.get_text()
            
            # Extract links
            links = []
            for link in soup.find_all('a', href=True):
                links.append({
                    "text": link.text.strip(),
                    "url": link['href']
                })
            
            return {
                "url": url,
                "title": soup.title.string if soup.title else "",
                "text": text[:5000],  # Limit text length
                "links": links[:20],  # Limit links
                "status_code": response.status_code
            }
            
        except Exception as e:
            logger.error(f"Web scraping error: {str(e)}")
            return {
                "url": url,
                "error": str(e)
            }
    
    def _http_request(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make HTTP request"""
        
        url = params.get("url")
        method = params.get("method", "GET").upper()
        headers = params.get("headers", {})
        data = params.get("data")
        
        if not url:
            raise ValueError("url is required")
        
        # Check if URL is in allowed domains
        parsed_url = urllib.parse.urlparse(url)
        if parsed_url.netloc not in CONFIG.allowed_domains:
            raise ValueError(f"Domain not allowed: {parsed_url.netloc}")
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=data if data else None,
                timeout=10
            )
            
            return {
                "url": url,
                "method": method,
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "content": response.text[:5000]  # Limit content length
            }
            
        except Exception as e:
            logger.error(f"HTTP request error: {str(e)}")
            return {
                "url": url,
                "method": method,
                "error": str(e)
            }
    
    def _json_parse(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Parse JSON data"""
        
        json_data = params.get("json_data")
        if not json_data:
            raise ValueError("json_data is required")
        
        try:
            if isinstance(json_data, str):
                parsed = json.loads(json_data)
            else:
                parsed = json_data
            
            return {
                "parsed": parsed,
                "type": type(parsed).__name__
            }
            
        except json.JSONDecodeError as e:
            return {
                "error": f"JSON parse error: {str(e)}"
            }
    
    def _text_process(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Process text data"""
        
        text = params.get("text")
        operation = params.get("operation", "analyze")
        
        if not text:
            raise ValueError("text is required")
        
        if operation == "analyze":
            return {
                "text": text,
                "length": len(text),
                "words": len(text.split()),
                "lines": len(text.split('\\n')),
                "characters": len(text.replace(' ', ''))
            }
        
        elif operation == "extract_emails":
            import re
            emails = re.findall(r'\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', text)
            return {
                "emails": emails,
                "count": len(emails)
            }
        
        elif operation == "extract_urls":
            import re
            urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', text)
            return {
                "urls": urls,
                "count": len(urls)
            }
        
        else:
            raise ValueError(f"Unknown operation: {operation}")
    
    def _get_secure_path(self, path: str) -> str:
        """Get secure path within working directory"""
        
        # Normalize path
        path = os.path.normpath(path)
        
        # If absolute path, make it relative to working directory
        if os.path.isabs(path):
            path = os.path.relpath(path, '/')
        
        # Join with working directory
        full_path = os.path.join(self.working_dir, path)
        
        # Ensure path is within working directory
        if not full_path.startswith(self.working_dir):
            raise ValueError(f"Path outside working directory: {path}")
        
        return full_path
    
    def _match_pattern(self, filename: str, pattern: str) -> bool:
        """Check if filename matches pattern"""
        
        if pattern == "*":
            return True
        
        # Simple pattern matching
        if pattern.startswith("*."):
            extension = pattern[2:]
            return filename.endswith(extension)
        
        return pattern in filename
    
    def get_available_tools(self) -> List[str]:
        """Get list of available tools"""
        return list(self.tools.keys())
    
    def get_tool_info(self, tool_name: str) -> Dict[str, Any]:
        """Get information about a specific tool"""
        
        tool_info = {
            "file_read": "Read content from a file",
            "file_write": "Write content to a file",
            "file_list": "List files in a directory",
            "file_delete": "Delete a file or directory",
            "file_copy": "Copy a file or directory",
            "file_move": "Move a file or directory",
            "directory_create": "Create a directory",
            "directory_list": "List directory contents",
            "git_clone": "Clone a Git repository",
            "git_commit": "Commit changes to Git repository",
            "git_push": "Push changes to remote repository",
            "git_pull": "Pull changes from remote repository",
            "git_status": "Get Git repository status",
            "git_branch": "Git branch operations",
            "web_search": "Search the web",
            "web_scrape": "Scrape web page content",
            "http_request": "Make HTTP requests",
            "json_parse": "Parse JSON data",
            "text_process": "Process text data"
        }
        
        return {
            "tool_name": tool_name,
            "description": tool_info.get(tool_name, "Unknown tool"),
            "available": tool_name in self.tools
        }
    
    def get_working_directory(self) -> str:
        """Get current working directory"""
        return self.working_dir
    
    def cleanup(self):
        """Clean up temporary files"""
        try:
            shutil.rmtree(self.working_dir)
            logger.info(f"Cleaned up working directory: {self.working_dir}")
        except Exception as e:
            logger.error(f"Error cleaning up working directory: {str(e)}")
