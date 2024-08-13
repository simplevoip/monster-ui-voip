%define debug_package %{nil}
{% if requires_excludes %}
{% for exclude in requires_excludes -%}
{% if loop.first %}
%global __requires_exclude {{ exclude }}
{% else %}
%global __requires_exclude %__requires_exclude|{{ exclude }}
{% endif %}
{% endfor %}
{%- endif %}
{% if provides_excludes %}
{% for exclude in provides_excludes -%}
{% if loop.first %}
%global __provides_exclude {{ exclude }}
{% else %}
%global __provides_exclude %__provides_exclude|{{ exclude }}
{% endif %}
{% endfor %}
{%- endif %}

Name: {{ name }}
Summary: {{ summary }}
License: {{ license }}
Group: {{ group }}
Version: %{_version}
Release: %{_release}{{ dist if dist else '.el7.centos' }}
URL: {{ url }}
Vendor: {{ vendor }}

Source0: %{_build_tar}

BuildRequires: rpm-build
BuildRequires: wget
BuildRequires: curl
BuildRequires: tar
BuildRequires: git
BuildRequires: nodejs

BuildArch: {{ arch if arch else 'noarch' }}

{% if core_version is defined and not rc and not master -%}
Requires: monster-ui-core >= {{ core_version }}
{% else %}
Requires: monster-ui-core
{%- endif %}

{% if provides is defined -%}
{% for p in provides -%}
Provides: {{ p.name }} {{ p.op }} {{ p.version }}-{{ p.release }}{{ dist if dist else '.el7.centos' }}
{%- endfor %}
{%- endif %}

%description
{{ description }}

######################################################################################################################
## Prepare for the build
######################################################################################################################
%prep
%setup -q -T -b 0

######################################################################################################################
## Bootstrap, Configure and Build the whole enchilada
######################################################################################################################
%build
%install
cd %{_builddir}/{{ name }}-%{_version}
mkdir -p %{buildroot}/var/www/html/monster-ui/apps
cp -r {{ app_name }} %{buildroot}/var/www/html/monster-ui/apps/{{ app_name }}

######################################################################################################################
## List of files/directories to include
######################################################################################################################
%files
%doc CHANGELOG VERSION
/var/www/html/monster-ui/apps/{{ app_name }}

######################################################################################################################
## Clean-up build system
######################################################################################################################
%clean